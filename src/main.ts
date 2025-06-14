import {
	CompanionActionDefinitions,
	CompanionFeedbackBooleanEvent,
	CompanionFeedbackDefinitions,
	InstanceBase,
	InstanceStatus,
	LogLevel,
	Regex,
	SomeCompanionConfigField,
	SomeCompanionFeedbackInputField,
	runEntrypoint,
} from '@companion-module/base'
import { Client, configureServer, request, startServer, stopServer } from './server.js'

type Config = { host: string; port: number; password: string; sticky: boolean }

const variablesString = [
	{ variableId: 'version', name: 'VSCode version' },
	{ variableId: 'debug_name', name: 'Name of the active debug session' },
	{ variableId: 'environment_host', name: 'Window host location' },
	{ variableId: 'environment_name', name: 'Window name' },
	{ variableId: 'environment_language', name: 'Current UI language' },
	{ variableId: 'environment_remote', name: 'Name of remote session in use' },
	{ variableId: 'environment_shell', name: 'Shell program in use' },
	{ variableId: 'workspace_name', name: 'The name of the active workspace' },
	{ variableId: 'git_branch', name: 'Current git branch' },
	{ variableId: 'git_commit', name: 'Current git commit' },
	{ variableId: 'git_remote', name: 'Git remote name' },
	{ variableId: 'git_url', name: 'Git remote URL' },
	{ variableId: 'editor_name', name: 'Name of the active editor' },
	{ variableId: 'editor_path', name: 'Path of the active editor' },
	{ variableId: 'editor_language', name: 'Language ID of the active editor' },
	{ variableId: 'editor_encoding', name: 'Encoding of the active editor' },
	{ variableId: 'editor_eol', name: 'EOL type of the active editor' },
	{ variableId: 'result_alert', name: 'Result of the last alert action' },
	{ variableId: 'result_input', name: 'Result of the last input action' },
	{ variableId: 'error_debug_start', name: 'Error message of the last debug start action' },
	{ variableId: 'error_activate', name: 'Error message of the last activate action' },
]

const variablesNumber = [
	{ variableId: 'clients_count', name: 'Number of connected clients' },
	{ variableId: 'commands_count', name: 'Number of available commands' },
	{ variableId: 'debug_breakpoints', name: 'Number of breakpoints' },
	{ variableId: 'extensions_count', name: 'Number of installed extensions' },
	{ variableId: 'extensions_active_count', name: 'Number of active extensions' },
	{ variableId: 'workspace_folders_count', name: 'Number of folders in the active workspace' },
	{ variableId: 'git_ahead', name: 'Number of commits ahead of remote' },
	{ variableId: 'git_behind', name: 'Number of commits behind remote' },
	{ variableId: 'git_changes', name: 'Number of changes in the working tree' },
	{ variableId: 'editor_indent', name: 'Indentation size of the active editor' },
	{ variableId: 'editor_column', name: 'Column number of the active selection' },
	{ variableId: 'editor_line', name: 'Line number of the active selection' },
	{ variableId: 'editor_lines', name: 'Line count of the active editor' },
	{ variableId: 'editor_warnings', name: 'Number of warnings in the active editor' },
	{ variableId: 'editor_errors', name: 'Number of errors in the active editor' },
]

const variablesBoolean = [
	{ variableId: 'debug', name: 'Whether a debug session is active' },
	{ variableId: 'workspace_trusted', name: 'Whether the workspace is trusted' },
	{ variableId: 'editor_tabs', name: 'Whether the active editor uses tabs' },
	{ variableId: 'editor_dirty', name: 'Whether the active editor contains unsaved changes' },
]

const variablesStringArray = [
	{ variableId: 'workspace_folders', name: 'List of folders in the active workspace' },
	{ variableId: 'result_pick', name: 'Result of the last pick action' },
]

export class Module extends InstanceBase<Config> {
	private static instance: Module | null = null
	private lists: Client['hidden'] = { commands: [], extensions: [], extensions_active: [] }

	async init(config: Config, _isFirstInit: boolean): Promise<void> {
		Module.instance = this
		this.updateStatus(InstanceStatus.Connecting)
		this.generateVariableDefinitions()
		this.generateActionDefinitions()
		this.generateFeedbackDefinitions()
		await this.configUpdated(config)
	}

	async destroy(): Promise<void> {
		stopServer()
	}

	async configUpdated(config: Config): Promise<void> {
		configureServer(config.password, config.sticky)
		startServer(config.host, config.port)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return [
			{
				id: 'host',
				type: 'textinput',
				regex: Regex.IP,
				label: 'Bind address',
				width: 6,
				default: '127.0.0.1',
				tooltip: 'Leave empty to bind to all interfaces',
			},
			{
				id: 'port',
				type: 'number',
				label: 'Port',
				width: 6,
				required: true,
				default: 6783,
				min: 1,
				max: 65535,
			},
			{
				id: 'password',
				type: 'textinput',
				label: 'Password',
				width: 6,
				default: '',
				tooltip: 'Leave empty to disable encryption',
			},
			{
				id: 'sticky',
				type: 'checkbox',
				label: 'Sticky',
				width: 6,
				default: false,
				tooltip: 'Whether to keep the primary client after it lost focus',
			},
		]
	}

	public static updateStatus(status: InstanceStatus, message?: string): void {
		if (Module.instance) Module.instance.updateStatus(status, message)
	}

	public static log(level: LogLevel, message: string): void {
		if (Module.instance) Module.instance.log(level, message)
	}

	public static updateClientCount(count: number): void {
		if (!Module.instance) return
		Module.instance.setVariableValues({ clients_count: count })
		Module.instance.checkFeedbacks()
	}

	public static updateClient(client: Client): void {
		if (!Module.instance) return
		Module.instance.lists = client.hidden
		Module.instance.setVariableValues(client.state)
		Module.instance.generateActionDefinitions()
		Module.instance.generateFeedbackDefinitions()
		Module.instance.checkFeedbacks()
	}

	private generateVariableDefinitions() {
		this.setVariableDefinitions([...variablesString, ...variablesNumber, ...variablesBoolean, ...variablesStringArray])
	}

	private generateFeedbackDefinitions() {
		const st = (id: string) => this.getVariableValue(id)!.toString()
		const op = (fb: CompanionFeedbackBooleanEvent, id: string) => fb.options[id]!.toString()
		function mkDropdown(id: string, label: string, options: string[]): SomeCompanionFeedbackInputField {
			const choices = options.map((v) => ({ id: v, label: v }))
			return { id, type: 'dropdown', label, default: choices[0]?.id ?? '', choices, allowCustom: true }
		}

		const feedbacks: CompanionFeedbackDefinitions = {}

		for (const variable of variablesString) {
			const id = variable.variableId
			const name = variable.name

			feedbacks[`${id}_contains`] = {
				type: 'boolean',
				name: `${name} contains...`,
				description: `Applies when ${name} contains the specified value`,
				defaultStyle: {},
				options: [{ id: 'value', type: 'textinput', label: 'Value' }],
				callback: (fb) => st(id).includes(op(fb, 'value')),
			}

			feedbacks[`${id}_matches`] = {
				type: 'boolean',
				name: `${name} matches...`,
				description: `Applies when ${name} matches the specified regular expression`,
				defaultStyle: {},
				options: [{ id: 'value', type: 'textinput', label: 'RegExp', default: '^.*$' }],
				callback: (fb) => new RegExp(op(fb, 'value')).test(st(id)),
			}
		}

		for (const variable of variablesStringArray) {
			const id = variable.variableId
			const name = variable.name

			feedbacks[`${id}_includes`] = {
				type: 'boolean',
				name: `${name} includes...`,
				description: `Applies when ${name} includes the specified value`,
				defaultStyle: {},
				options: [mkDropdown('value', 'Value', st(id).split(','))],
				callback: (fb) => st(id).split(',').includes(op(fb, 'value')),
			}
		}

		feedbacks['command_available'] = {
			type: 'boolean',
			name: 'Command available',
			description: 'Applies when the specified command is available',
			defaultStyle: {},
			options: [mkDropdown('command', 'Command', this.lists.commands)],
			callback: (fb) => this.lists.commands.includes(op(fb, 'command')),
		}

		feedbacks['extension_installed'] = {
			type: 'boolean',
			name: 'Extension installed',
			description: 'Applies when the specified extension is installed',
			defaultStyle: {},
			options: [mkDropdown('extension', 'Extension', this.lists.extensions)],
			callback: (fb) => this.lists.extensions.includes(op(fb, 'extension')),
		}

		feedbacks['extension_active'] = {
			type: 'boolean',
			name: 'Extension active',
			description: 'Applies when the specified extension is active',
			defaultStyle: {},
			options: [mkDropdown('extension', 'Extension', this.lists.extensions)],
			callback: (fb) => this.lists.extensions_active.includes(op(fb, 'extension')),
		}

		this.setFeedbackDefinitions(feedbacks)
	}

	private generateActionDefinitions() {
		const cmds = this.lists.commands.map((command) => ({ id: command, label: command }))
		const exts = this.lists.extensions.map((extension) => ({ id: extension, label: extension }))
		const lvls = [
			{ id: 'info', label: 'Info' },
			{ id: 'warn', label: 'Warning' },
			{ id: 'error', label: 'Error' },
		]

		const actions: CompanionActionDefinitions = {
			alert: {
				name: 'Send a notification',
				options: [
					{ id: 'message', type: 'textinput', label: 'Message', required: true },
					{ id: 'level', type: 'dropdown', label: 'Level', default: 'info', choices: lvls },
					{ id: 'options', type: 'textinput', label: 'Options (comma separated)' },
				],
				async callback(action) {
					const result = await request({
						id: null,
						type: 'alert',
						message: action.options.message?.toString() ?? '',
						level: action.options.level?.toString() as 'info' | 'warn' | 'error' | undefined,
						options: action.options.options?.toString().split(','),
					})

					switch (result.type) {
						case 'ok':
							Module.instance?.setVariableValues({ result_alert: 'N/A' })
							break

						case 'string':
							Module.instance?.setVariableValues({ result_alert: result.value })
							break

						default:
							return
					}

					Module.instance?.checkFeedbacks()
				},
			},
			status: {
				name: 'Display a status bar message',
				options: [
					{ id: 'message', type: 'textinput', label: 'Message', required: true },
					{ id: 'timeout', type: 'number', label: 'Timeout (ms)', default: 5000, min: 0, max: 60000 },
				],
				async callback(action) {
					const timeout = action.options.timeout?.toString()

					await request({
						id: null,
						type: 'status',
						message: action.options.message?.toString() ?? '',
						timeout: timeout === undefined ? undefined : parseInt(timeout),
					})
				},
			},
			input: {
				name: 'Prompt the user for input',
				options: [
					{ id: 'title', type: 'textinput', label: 'Title', required: true },
					{ id: 'placeholder', type: 'textinput', label: 'Placeholder' },
					{ id: 'value', type: 'textinput', label: 'Initial value' },
					{ id: 'password', type: 'checkbox', label: 'Hide input', default: false, tooltip: "Hide the user's input" },
				],
				async callback(action) {
					const password = action.options.password?.toString()

					const result = await request({
						id: null,
						type: 'input',
						title: action.options.title?.toString() ?? '',
						placeholder: action.options.placeholder?.toString(),
						value: action.options.value?.toString(),
						password: password === undefined ? undefined : password === 'true',
					})

					switch (result.type) {
						case 'string':
							Module.instance?.setVariableValues({ result_input: result.value })
							break

						case 'error':
							Module.instance?.setVariableValues({ result_input: 'N/A' })
							break

						default:
							return
					}

					Module.instance?.checkFeedbacks()
				},
			},
			pick: {
				name: 'Prompt the user to pick from a list of options',
				options: [
					{ id: 'title', type: 'textinput', label: 'Title', required: true },
					{ id: 'options', type: 'textinput', label: 'Options (comma separated)', required: true },
					{ id: 'placeholder', type: 'textinput', label: 'Placeholder' },
					{ id: 'multi', type: 'checkbox', label: 'Allow multiple selections', default: false },
				],
				async callback(action) {
					const multi = action.options.multi?.toString()

					const result = await request({
						id: null,
						type: 'pick',
						title: action.options.title?.toString() ?? '',
						options: action.options.options?.toString().split(',') ?? [],
						placeholder: action.options.placeholder?.toString(),
						multi: multi === undefined ? undefined : multi === 'true',
					})

					switch (result.type) {
						case 'string':
							Module.instance?.setVariableValues({ result_pick: result.value })
							break

						case 'strings':
							Module.instance?.setVariableValues({ result_pick: result.value.join(',') })
							break

						case 'error':
							Module.instance?.setVariableValues({ result_pick: 'N/A' })
							break

						default:
							return
					}

					Module.instance?.checkFeedbacks()
				},
			},
			command: {
				name: 'Execute a command',
				options: [
					{ id: 'command', type: 'dropdown', label: 'Command', default: 'noop', choices: cmds },
					{ id: 'args', type: 'textinput', label: 'Arguments (JSON)', default: '[]' },
				],
				async callback(action) {
					const args = action.options.args?.toString()

					await request({
						id: null,
						type: 'command',
						command: action.options.command?.toString() ?? '',
						args: args === undefined ? undefined : JSON.parse(args),
					})
				},
			},
			debug_start: {
				name: 'Start a debug session',
				options: [
					{ id: 'name', type: 'textinput', label: 'Config name', required: true },
					{ id: 'folder', type: 'textinput', label: 'Folder', tooltip: 'Leave empty to guess' },
				],
				async callback(action) {
					const folder = action.options.folder?.toString()

					const result = await request({
						id: null,
						type: 'debug-start',
						name: action.options.name?.toString() ?? '',
						folder: folder === '' ? undefined : folder,
					})

					if (result.type === 'error') Module.instance?.setVariableValues({ error_debug_start: result.message })
					else Module.instance?.setVariableValues({ error_debug_start: 'N/A' })

					Module.instance?.checkFeedbacks()
				},
			},
			debug_stop: {
				name: 'Stop the active debug session',
				options: [],
				async callback() {
					await request({ id: null, type: 'debug-stop' })
				},
			},
			activate: {
				name: 'Manually activate an extension',
				options: [{ id: 'extension', type: 'dropdown', label: 'Extension', default: exts[0]?.id ?? '', choices: exts }],
				async callback(action) {
					const result = await request({
						id: null,
						type: 'activate',
						extension: action.options.extension?.toString() ?? '',
					})

					if (result.type === 'error') Module.instance?.setVariableValues({ error_activate: result.message })
					else Module.instance?.setVariableValues({ error_activate: 'N/A' })

					Module.instance?.checkFeedbacks()
				},
			},
		}

		this.setActionDefinitions(actions)
	}
}

runEntrypoint(Module, [])
