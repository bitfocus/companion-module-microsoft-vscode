import { CompanionActionDefinitions, CompanionVariableValues } from '@companion-module/base'

export function generateActions(
	req: (data: any, callback: (data: any) => void) => void,
	setVars: (vars: CompanionVariableValues) => void,
	reloadCommands: () => void,
	commands: string[]
): CompanionActionDefinitions {
	const actions: CompanionActionDefinitions = {}

	actions['alert'] = {
		name: 'Send notification',
		description: 'Display a notification in the bottom right corner of the window',
		options: [
			{ id: 'message', type: 'textinput', label: 'Message' },
			{
				id: 'level',
				type: 'dropdown',
				label: 'Level',
				default: 'info',
				choices: [
					{ id: 'info', label: 'Info' },
					{ id: 'warning', label: 'Warning' },
					{ id: 'error', label: 'Error' },
				],
			},
			{
				id: 'options',
				type: 'textinput',
				label: 'Options (comma separated)',
				default: '',
				tooltip: 'Each option will be displayed as a button',
			},
		],
		callback: (action) =>
			req(
				{
					action: 'alert',
					message: action.options.message?.toString(),
					level: action.options.level?.toString(),
					options: action.options.options?.toString().split(','),
				},
				(res) => {
					setVars({ response_alert: res.selected })
				}
			),
	}

	actions['status'] = {
		name: 'Display status bar message',
		description: 'Display a message in the status bar at the bottom of the window',
		options: [
			{ id: 'message', type: 'textinput', label: 'Message' },
			{ id: 'timeout', type: 'number', label: 'Timeout (ms)', default: 5000, min: 0, max: 1e9 },
		],
		callback: (action) =>
			req(
				{
					action: 'status',
					message: action.options.message?.toString(),
					timeout: parseInt(action.options.timeout?.toString() || '5000'),
				},
				() => {}
			),
	}

	actions['input'] = {
		name: 'Display input dialog',
		description: 'Display a dialog with a text input field',
		options: [
			{ id: 'title', type: 'textinput', label: 'Title' },
			{ id: 'placeholder', type: 'textinput', label: 'Placeholder' },
			{ id: 'value', type: 'textinput', label: 'Default value' },
		],
		callback: (action) =>
			req(
				{
					action: 'input',
					title: action.options.title?.toString(),
					placeholder: action.options.placeholder?.toString(),
					value: action.options.value?.toString(),
				},
				(data) => {
					setVars({ response_input: data.value })
				}
			),
	}

	actions['pick'] = {
		name: 'Display picker dialog',
		description: 'Display a dialog with a list of items to choose from',
		options: [
			{ id: 'title', type: 'textinput', label: 'Title' },
			{ id: 'placeholder', type: 'textinput', label: 'Placeholder' },
			{ id: 'items', type: 'textinput', label: 'Items (comma separated)' },
			{ id: 'multi', type: 'checkbox', label: 'Multi select', default: false },
		],
		callback: (action) =>
			req(
				{
					action: 'pick',
					title: action.options.title?.toString(),
					placeholder: action.options.placeholder?.toString(),
					items: action.options.items?.toString().split(','),
					multi: action.options.multi?.toString() === 'true',
				},
				(data) => {
					if (Array.isArray(data.selected)) setVars({ response_pick: data.selected.join(',') })
					else setVars({ response_pick: data.selected })
				}
			),
	}

	actions['command'] = {
		name: 'Run command',
		description: 'Run a command in the editor',
		options: [
			{
				id: 'command',
				type: 'dropdown',
				label: 'Command',
				default: 'noop',
				choices: commands.map((c) => ({ id: c, label: c })),
				tooltip:
					"If no commands are available, wait until they are reloaded or manually trigger the 'Reload commands' action",
			},
			{
				id: 'args',
				type: 'textinput',
				label: 'Arguments (JSON)',
				default: '[]',
				tooltip: 'Some commands take additional arguments that would otherwise require user interaction',
			},
		],
		callback: (action) =>
			req(
				{
					action: 'run-command',
					command: action.options.command?.toString(),
					args: JSON.parse(action.options.args?.toString() ?? '[]'),
				},
				() => {}
			),
	}

	actions['reload'] = {
		name: 'Reload commands',
		description: 'Reload the list of available commands',
		options: [],
		callback: reloadCommands,
	}

	return actions
}
