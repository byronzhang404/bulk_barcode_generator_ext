// 获取所有配置项的值
function getAllSettings() {
    return {
        barcodeType: document.getElementById('barcodeType').value,
        barWidth: document.getElementById('bar-width').value,
        barHeight: document.getElementById('bar-height').value,
        barMargin: document.getElementById('bar-margin').value,
        backgroundColor: document.getElementById('background-color').value,
        lineColor: document.getElementById('line-color').value,
        displayText: document.querySelector('.display-text.btn-primary').value === 'true',
        textAlign: document.querySelector('.text-align.btn-primary').value,
        font: document.getElementById('font').value,
        fontOptions: {
            bold: document.querySelector('.font-option[value="bold"]').classList.contains('btn-primary'),
            italic: document.querySelector('.font-option[value="italic"]').classList.contains('btn-primary')
        },
        fontSize: document.getElementById('bar-fontSize').value,
        textMargin: document.getElementById('bar-text-margin').value
    };
}

// 添加按钮点击事件处理
document.getElementById('generateButton').addEventListener('click', async function() {
    try {
        const inputText = document.getElementById('barcodeInput').value;
        const settings = getAllSettings();
        
        // 发送消息给 background script 处理
        await chrome.runtime.sendMessage({ 
            type: 'GENERATE_BARCODE',
            inputText: inputText,
            settings: settings
        });
        
    } catch (err) {
        console.error('Error in click handler:', err);
    }
});

// 添加所有配置项的事件监听
function initializeUI() {
    // 范围滑块值显示
    ['bar-width', 'bar-height', 'bar-margin', 'bar-fontSize', 'bar-text-margin'].forEach(id => {
        const input = document.getElementById(id);
        const display = document.getElementById(id + '-display');
        input.addEventListener('input', () => {
            display.textContent = input.value;
        });
        // 初始化显示值
        display.textContent = input.value;
    });

    // 按钮组处理
    document.querySelectorAll('.btn-group').forEach(group => {
        group.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除同组其他按钮的 primary 类
                group.querySelectorAll('.btn').forEach(b => {
                    b.classList.remove('btn-primary');
                });
                // 添加当前按钮的 primary 类
                btn.classList.add('btn-primary');

                // 特殊处理显示/隐藏文本选项
                if (btn.classList.contains('display-text')) {
                    const fontOptions = document.getElementById('font-options');
                    fontOptions.style.display = btn.value === 'true' ? 'block' : 'none';
                }
            });
        });
    });
}

// 当 popup 打开时初始化 UI
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
});