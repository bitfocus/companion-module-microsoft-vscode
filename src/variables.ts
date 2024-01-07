import { CompanionVariableDefinition } from '@companion-module/base'

export const stringVariables: CompanionVariableDefinition[] = [
	{ variableId: 'version', name: 'VSCode version' },
	{ variableId: 'language', name: 'Language (current file)' },
	{ variableId: 'status_editor_document_name', name: 'Editor document name' },
	{ variableId: 'status_editor_encoding', name: 'Editor encoding' },
	{ variableId: 'status_editor_language_id', name: 'Editor language id' },
	{ variableId: 'status_git_branch', name: 'Git branch' },
	{ variableId: 'status_workspace_name', name: 'Workspace name' },
	{ variableId: 'response_alert', name: 'Last notification response' },
	{ variableId: 'response_input', name: 'Last input response' },
	{ variableId: 'response_pick', name: 'Last picker response' },
]

export const numberVariables: CompanionVariableDefinition[] = [
	{ variableId: 'lines', name: 'Line count (current file)' },
	{ variableId: 'tab_size', name: 'Tab size (current file)' },
	{ variableId: 'commands', name: 'Command count' },
	{ variableId: 'status_editor_column_number', name: 'Editor current column' },
	{ variableId: 'status_editor_line_number', name: 'Editor current line' },
	{ variableId: 'status_editor_error_count', name: 'Editor error count' },
]

export const booleanVariables: CompanionVariableDefinition[] = [
	{ variableId: 'status_debug_active_session', name: 'Active debug session' },
]

export const variables: CompanionVariableDefinition[] = [...stringVariables, ...numberVariables, ...booleanVariables]
