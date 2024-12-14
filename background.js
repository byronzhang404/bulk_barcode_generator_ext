// 存储日志的数组
let logs = [];

// 添加日志的函数
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    logs.push(logEntry);
    if (logs.length > 50) {
        logs.shift();
    }
    chrome.storage.local.set({ logs: logs });
}

// 注入和填充输入框的函数
async function injectAndFill(tabId, inputText, settings) {
    try {
        addLog('Executing script in tab: ' + tabId);
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (text, config) => {
                const status = {
                    foundElement: false,
                    attempts: 0,
                    success: false,
                    error: null
                };

                try {
                    // 设置输入值和触发事件的函数
                    const setValueAndTrigger = (element, value) => {
                        if (!element) return;
                        element.value = value;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        // 对于文本输入，额外触发 keyup 事件
                        if (element.id === 'userInput') {
                            element.dispatchEvent(new Event('keyup', { bubbles: true }));
                        }
                    };

                    // 设置按钮状态的函数
                    const setButtonState = (selector, value) => {
                        const buttons = document.querySelectorAll(selector);
                        buttons.forEach(btn => {
                            btn.classList.toggle('btn-primary', btn.value === value.toString());
                        });
                        // 触发点击事件
                        const activeBtn = Array.from(buttons).find(btn => btn.value === value.toString());
                        if (activeBtn) {
                            activeBtn.click();
                        }
                    };

                    // 应用所有设置
                    const applySettings = () => {
                        // 首先应用条形码类型
                        setValueAndTrigger(document.getElementById('barcodeType'), config.barcodeType);
                        
                        // 然后设置文本输入（确保在设置其他选项后再设置文本）
                        setTimeout(() => {
                            setValueAndTrigger(document.getElementById('userInput'), text);
                        }, 100);
                        
                        // 滑块值
                        setValueAndTrigger(document.getElementById('bar-width'), config.barWidth);
                        setValueAndTrigger(document.getElementById('bar-height'), config.barHeight);
                        setValueAndTrigger(document.getElementById('bar-margin'), config.barMargin);
                        setValueAndTrigger(document.getElementById('bar-fontSize'), config.fontSize);
                        setValueAndTrigger(document.getElementById('bar-text-margin'), config.textMargin);
                        
                        // 颜色选择器
                        setValueAndTrigger(document.getElementById('background-color'), config.backgroundColor);
                        setValueAndTrigger(document.getElementById('line-color'), config.lineColor);
                        
                        // 显示文本按钮
                        setButtonState('.display-text', config.displayText);
                        
                        // 根据显示文本设置控制字体选项的显示
                        const fontOptions = document.getElementById('font-options');
                        if (fontOptions) {
                            fontOptions.style.display = config.displayText ? 'block' : 'none';
                        }
                        
                        // 文本对齐按钮
                        setButtonState('.text-align', config.textAlign);
                        
                        // 字体选择
                        setValueAndTrigger(document.getElementById('font'), config.font);
                        
                        // 字体选项按钮
                        if (config.fontOptions.bold) {
                            document.querySelector('.font-option[value="bold"]').click();
                        }
                        if (config.fontOptions.italic) {
                            document.querySelector('.font-option[value="italic"]').click();
                        }
                    };

                    // 检查元素是否存在并应用设置
                    let input = document.getElementById('userInput');
                    if (input) {
                        applySettings();
                        status.foundElement = true;
                        status.success = true;
                        return status;
                    }
                    
                    return new Promise((resolve) => {
                        let attempts = 0;
                        const maxAttempts = 50;
                        
                        const checkElement = setInterval(() => {
                            attempts++;
                            status.attempts = attempts;
                            input = document.getElementById('userInput');
                            
                            if (input) {
                                clearInterval(checkElement);
                                applySettings();
                                status.foundElement = true;
                                status.success = true;
                                resolve(status);
                            } else if (attempts >= maxAttempts) {
                                clearInterval(checkElement);
                                status.error = 'Max attempts reached';
                                resolve(status);
                            }
                        }, 100);
                    });
                } catch (err) {
                    status.error = err.message;
                    return status;
                }
            },
            args: [inputText, settings]
        });
        
        const status = results[0].result;
        addLog(JSON.stringify(status, null, 2));
        
    } catch (err) {
        addLog('Error executing script: ' + err.message);
    }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_LOGS') {
        sendResponse({ logs: logs });
    } else if (message.type === 'ADD_LOG') {
        addLog(message.content);
        sendResponse({ success: true });
    } else if (message.type === 'GENERATE_BARCODE') {
        (async () => {
            try {
                const { inputText, settings } = message;
                addLog('Starting barcode generation...');

                const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                
                await chrome.tabs.update(currentTab.id, {
                    url: 'https://bulkbarcodegenerator.org/generator.html'
                });

                chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                    if (tabId === currentTab.id && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        setTimeout(() => {
                            injectAndFill(currentTab.id, inputText, settings);
                        }, 500);
                    }
                });

                sendResponse({ success: true });
            } catch (err) {
                addLog('Error: ' + err.message);
                sendResponse({ success: false, error: err.message });
            }
        })();
        return true;
    }
}); 