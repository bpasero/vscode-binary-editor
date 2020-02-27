
(function () {
    const vscode = acquireVsCodeApi();

    vscode.postMessage({ type: 'webview->exthost:ready' });

    let editor;
    let ignoreChange = false;

    window.addEventListener('message', e => {
        switch (e.data.type) {
            case 'exhost->webview:init':
                ignoreChange = true;
                try {
                    editor = buildEditor(e.data.payload);
                } finally {
                    ignoreChange = false;
                }
                break;
            case 'exhost->webview:acceptContent':
                if (e.data.payload === editor.getValue()) {
                    return; // ignore changes that are not a change actually
                }

                ignoreChange = true;
                try {
                    editor.setValue(e.data.payload);
                } finally {
                    ignoreChange = false;
                }
                break;
        }
    });

    function buildEditor(value) {
        const instance = new tui.Editor({
            el: document.querySelector('#editorSection'),
            initialEditType: 'wysiwyg',
            previewStyle: 'tab',
            height: 'auto',
            hideModeSwitch: true,
            initialValue: value,
            usageStatistics: false,
            events: {
                'change': () => {
                    if (ignoreChange) {
                        return;
                    }

                    vscode.postMessage({ type: 'webview->exthost:changeContent', payload: instance.getValue() });
                }
            }
        });

        instance.getHtml();

        return instance;
    }
})();
