import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "custom-binary-editor" is now active!');

	vscode.window.registerCustomEditorProvider('custom-binary-editor', new CustomBinaryEditorProvider(), {});
}

export class CustomBinaryEditorProvider implements vscode.CustomEditorProvider {

	private mapDocumentToEditor: Map<vscode.CustomDocument, CustomBinaryEditor> = new Map();
	private mapDocumentToEditingCapabilities: Map<vscode.CustomDocument, CustomBinaryEditingCapabilities> = new Map();

	async resolveCustomDocument(document: vscode.CustomDocument): Promise<vscode.CustomEditorCapabilities> {
		let capabilities = this.mapDocumentToEditingCapabilities.get(document);
		if (!capabilities) {
			capabilities = new CustomBinaryEditingCapabilities(document);
			this.mapDocumentToEditingCapabilities.set(document, capabilities);
		}

		return {
			editing: capabilities
		};
	}

	async resolveCustomEditor(document: vscode.CustomDocument, panel: vscode.WebviewPanel): Promise<void> {
		let editor = this.mapDocumentToEditor.get(document);
		if (!editor) {
			editor = new CustomBinaryEditor(document, panel);
			this.mapDocumentToEditor.set(document, editor);

			this.mapDocumentToEditingCapabilities.get(document)?.connect(panel);

			panel.onDidDispose(() => {
				editor?.dispose();
				this.mapDocumentToEditor.delete(document);
			});
		}
	}
}

interface IMarkdownEdit {
	versionId: number;
	prevVersionId: number;
}

export class CustomBinaryEditingCapabilities implements vscode.CustomEditorEditingCapability<IMarkdownEdit> {

	private panel: vscode.WebviewPanel | undefined = undefined;
	private contents: string | undefined = undefined;

	private mapVersionIdToContent = new Map<number, string>();
	private versionId = 0;

	constructor(private document: vscode.CustomDocument) {
		this.contents = fs.readFileSync(document.uri.fsPath).toString();
		this.mapVersionIdToContent.set(this.versionId, this.contents);
	}

	connect(panel: vscode.WebviewPanel): void {
		this.panel = panel;

		panel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'webview->exthost:changeContent':
					if (this.contents !== e.payload) {
						this.versionId++;
						this.mapVersionIdToContent.set(this.versionId, e.payload);

						this._onDidEdit.fire({ versionId: this.versionId, prevVersionId: this.versionId - 1 });
						this.contents = e.payload;
					}
					break;
			}
		});
	}

	async save(): Promise<void> {
		if (this.contents) {
			fs.writeFileSync(this.document.uri.fsPath, this.contents);
		}
	}

	async saveAs(targetResource: vscode.Uri): Promise<void> {
		if (this.contents) {
			fs.writeFileSync(targetResource.fsPath, this.contents);
		}
	}

	private _onDidEdit: vscode.EventEmitter<IMarkdownEdit> = new vscode.EventEmitter<IMarkdownEdit>();
	onDidEdit: vscode.Event<IMarkdownEdit> = this._onDidEdit.event;

	async applyEdits(edits: readonly IMarkdownEdit[]): Promise<void> {
		if (!this.panel) {
			return;
		}

		for (const edit of edits) {
			this.contents = this.mapVersionIdToContent.get(edit.versionId);

			this.panel.webview.postMessage({
				type: 'exhost->webview:acceptContent',
				payload: this.mapVersionIdToContent.get(edit.versionId)
			});
		}
	}

	async undoEdits(edits: readonly IMarkdownEdit[]): Promise<void> {
		if (!this.panel) {
			return;
		}

		for (const edit of edits) {
			this.panel.webview.postMessage({
				type: 'exhost->webview:acceptContent',
				payload: this.mapVersionIdToContent.get(edit.prevVersionId)
			});
		}
	}

	async backup(cancellation: vscode.CancellationToken): Promise<boolean> {
		throw new Error("Method not implemented.");
	}
}

export class CustomBinaryEditor {

	private disposables: vscode.Disposable[] = [];

	constructor(private document: vscode.CustomDocument, private panel: vscode.WebviewPanel) {
		panel.webview.options = { enableScripts: true };

		panel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'webview->exthost:ready':
					panel.webview.postMessage({
						type: 'exhost->webview:init',
						payload: fs.readFileSync(document.uri.fsPath).toString()
					});
					break;
			}
		});

		panel.webview.html = this.getEditorHtml(panel);
	}

	private getEditorHtml(panel: vscode.WebviewPanel): string {
		return `
		<html>
			<head>
				
			<!-- Styles -->
				<link rel="stylesheet" href="https://uicdn.toast.com/tui-editor/latest/tui-editor.css"></link>
				<link rel="stylesheet" href="https://uicdn.toast.com/tui-editor/latest/tui-editor-contents.css"></link>
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.48.4/codemirror.css"></link>
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/github.min.css"></link>
				
				<!-- Scripts -->
				<script src="https://uicdn.toast.com/tui-editor/latest/tui-editor-Editor-full.js"></script>
			</head>	
			<body>
				<div id="editorSection"></div>
				<script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.resolve(__dirname, '..', 'static', 'editor.js')))}"></script>
			</body>
		</html>`;
	}

	dispose(): void {
		for (const disposable of this.disposables) {
			disposable.dispose();
		}

		this.disposables = [];
	}
}