import { InstanceStatus } from '@companion-module/base'
import { WebSocket, WebSocketServer } from 'ws'
import { Request, Response, State, decrypt, encrypt } from './global.js'
import { Module } from './main.js'

export type Client = {
	socket: WebSocket
	state: {
		version: string
		debug_name: string
		environment_host: string
		environment_name: string
		environment_language: string
		environment_remote: string
		environment_shell: string
		workspace_name: string
		git_branch: string
		git_commit: string
		git_remote: string
		git_url: string
		editor_name: string
		editor_path: string
		editor_language: string
		editor_encoding: string
		editor_eol: string
		commands_count: number
		debug_breakpoints: number
		extensions_count: number
		extensions_active_count: number
		workspace_folders_count: number
		git_ahead: number
		git_behind: number
		git_changes: number
		editor_indent: number
		editor_column: number
		editor_line: number
		editor_lines: number
		editor_warnings: number
		editor_errors: number
		debug: boolean
		workspace_trusted: boolean
		editor_tabs: boolean
		editor_dirty: boolean
		workspace_folders: string
	}
	hidden: {
		commands: string[]
		extensions: string[]
		extensions_active: string[]
	}
}

const defaultState: Client['state'] = {
	version: 'N/A',
	debug_name: 'N/A',
	environment_host: 'N/A',
	environment_name: 'N/A',
	environment_language: 'N/A',
	environment_remote: 'N/A',
	environment_shell: 'N/A',
	workspace_name: 'N/A',
	git_branch: 'N/A',
	git_commit: 'N/A',
	git_remote: 'N/A',
	git_url: 'N/A',
	editor_name: 'N/A',
	editor_path: 'N/A',
	editor_language: 'N/A',
	editor_encoding: 'N/A',
	editor_eol: 'N/A',
	commands_count: 0,
	debug_breakpoints: 0,
	extensions_count: 0,
	extensions_active_count: 0,
	workspace_folders_count: 0,
	git_ahead: 0,
	git_behind: 0,
	git_changes: 0,
	editor_indent: 0,
	editor_column: 0,
	editor_line: 0,
	editor_lines: 0,
	editor_warnings: 0,
	editor_errors: 0,
	debug: false,
	workspace_trusted: false,
	editor_tabs: false,
	editor_dirty: false,
	workspace_folders: '',
}

const defaultHidden: Client['hidden'] = {
	commands: [],
	extensions: [],
	extensions_active: [],
}

let server: WebSocketServer | null = null
let config = { password: '', sticky: false }
let clients: Client[] = []
let primary: Client | null = null
let requestID: number = 0
let callbacks: { [id: number]: { res: (response: Response) => void; rej: () => void } } = {}

export function configureServer(password: string, sticky: boolean): void {
	config = { password, sticky }
}

export function startServer(host: string, port: number): void {
	server?.close()
	try {
		server = new WebSocketServer({ host: host === '' ? undefined : host, port })
	} catch (error: any) {
		Module.updateStatus(InstanceStatus.BadConfig, 'unable to start server')
		Module.log('error', `unable to start server: ${error.message ?? 'unknown error'}`)
		return
	}

	server.on('error', (err) => {
		Module.log('error', `server error: ${err.message}`)
	})

	server.on('connection', (con) => {
		clients.push({ socket: con, state: { ...defaultState }, hidden: { ...defaultHidden } })
		Module.updateClientCount(clients.length)

		con.on('close', () => {
			clients = clients.filter((c) => c.socket.readyState === c.socket.OPEN)
			Module.updateClientCount(clients.length)

			if (primary?.socket === con) {
				primary = null
				Module.updateClient({ socket: con, state: { ...defaultState }, hidden: { ...defaultHidden } })
				Module.updateStatus(InstanceStatus.Disconnected)
			}
		})

		con.on('message', (message) => {
			const client = clients.find((c) => c.socket === con)
			if (client && !(message instanceof ArrayBuffer)) handleMessage(client, message.toString())
		})
	})
}

export function stopServer(): void {
	server?.close()
	clients = []
	primary = null
	requestID = 0
	callbacks = {}
}

export async function request(data: Request): Promise<Response> {
	if (Object.keys(callbacks).length > 100) {
		for (const id in callbacks) callbacks[id].rej()
		callbacks = {}
	}

	if (!primary) return new Promise<Response>((_res, rej) => rej(new Error('No primary client')))

	data.id = requestID++
	let message = JSON.stringify(data)
	if (config.password) message = encrypt(message, config.password)

	primary.socket.send(message)
	return new Promise<Response>((res, rej) => (callbacks[data.id] = { res, rej }))
}

function handleMessage(client: Client, message: string) {
	if (config.password) message = decrypt(message, config.password)

	let data
	try {
		data = JSON.parse(message)
	} catch {
		return
	}

	if ('id' in data) {
		const callback = callbacks[data.id]
		if (callback) {
			callback.res(data)
			delete callbacks[data.id]
		}

		return
	}

	const state: State = data
	switch (state.type) {
		case 'version':
			client.state.version = state.version
			break

		case 'focus':
			if (state.focus && !(config.sticky && primary)) {
				primary = client
				Module.updateStatus(InstanceStatus.Ok)
			}
			break

		case 'commands':
			client.hidden.commands = state.commands
			client.state.commands_count = state.commands.length
			break

		case 'debug':
			client.state.debug = state.debug
			client.state.debug_name = state.name ?? 'N/A'
			client.state.debug_breakpoints = state.breakpoints ?? 0
			break

		case 'environment':
			client.state.environment_host = state.host
			client.state.environment_name = state.name
			client.state.environment_language = state.language
			client.state.environment_remote = state.remote ?? 'N/A'
			client.state.environment_shell = state.shell
			break

		case 'extensions':
			client.hidden.extensions = state.extensions
			client.state.extensions_count = state.extensions.length
			client.hidden.extensions_active = state.active
			client.state.extensions_active_count = state.active.length
			break

		case 'workspace':
			client.state.workspace_name = state.name ?? 'N/A'
			client.state.workspace_trusted = state.trusted
			client.state.workspace_folders_count = state.folders?.length ?? 0
			client.state.workspace_folders = state.folders?.join(', ') ?? ''
			break

		case 'git':
			client.state.git_branch = state.branch ?? 'N/A'
			client.state.git_commit = state.commit ?? 'N/A'
			client.state.git_remote = state.remote ?? 'N/A'
			client.state.git_url = state.url ?? 'N/A'
			client.state.git_ahead = state.ahead ?? 0
			client.state.git_behind = state.behind ?? 0
			client.state.git_changes = state.changes ?? 0
			break

		case 'editor':
			client.state.editor_name = state.name ?? 'N/A'
			client.state.editor_path = state.path ?? 'N/A'
			client.state.editor_language = state.language ?? 'N/A'
			client.state.editor_encoding = state.encoding ?? 'N/A'
			client.state.editor_eol = state.eol ?? 'N/A'
			client.state.editor_indent = state.indent ?? 0
			client.state.editor_tabs = state.tabs ?? false
			client.state.editor_column = state.column ?? 0
			client.state.editor_line = state.line ?? 0
			client.state.editor_lines = state.lines ?? 0
			client.state.editor_warnings = state.warnings ?? 0
			client.state.editor_errors = state.errors ?? 0
			client.state.editor_dirty = state.dirty ?? false
			break
	}

	if (primary === client) Module.updateClient(client)
}
