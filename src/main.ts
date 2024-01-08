import { InstanceBase, InstanceStatus, SomeCompanionConfigField, runEntrypoint } from '@companion-module/base'
import { WebSocket } from 'ws'
import { generateActions } from './actions'
import { CONFIG, Config } from './config'
import { decrypt, encrypt } from './crypto'
import { feedbackVariants, generateFeedbacks } from './feedbacks'
import { variables } from './variables'

class ModuleInstance extends InstanceBase<Config> {
	private socket: WebSocket | null = null
	private password: string = ''
	private callbacks: { [id: number]: (data: any) => void } = {}
	private requestID: number = 0
	private timerReconnect: NodeJS.Timeout | null = null
	private timerReloadState: NodeJS.Timeout | null = null
	private timerReloadCommands: NodeJS.Timeout | null = null

	async init(config: Config, isFirstInit: boolean) {
		// Load definitions
		this.setVariableDefinitions(variables)
		this.setFeedbackDefinitions(generateFeedbacks((name) => this.getVariableValue(name)?.toString()))
		this.setActionDefinitions(
			generateActions(this.send.bind(this), this.setVariableValues.bind(this), this.reloadCommands.bind(this), [])
		)

		// Start socket connection
		await this.configUpdated(config)
	}

	async destroy() {
		// Clear timers
		if (this.timerReconnect) clearTimeout(this.timerReconnect)
		this.timerReconnect = null

		if (this.timerReloadState) clearInterval(this.timerReloadState)
		this.timerReloadState = null

		if (this.timerReloadCommands) clearInterval(this.timerReloadCommands)
		this.timerReloadCommands = null

		// Close socket connection
		if (this.socket) {
			this.socket.removeAllListeners()
			this.socket.close()
		}
	}

	async configUpdated(config: Config) {
		// Set instance status
		this.updateStatus(InstanceStatus.Connecting)

		// Destroy old socket connection
		await this.destroy()

		// Set new password
		this.password = config.password

		// Start socket connection
		this.socket = new WebSocket(`ws://${config.host}:${config.port}`)

		// When socket opens, set instance status
		this.socket.on('open', () => this.updateStatus(InstanceStatus.Ok))

		// When socket closes, set instance status and try to reconnect
		this.socket.on('close', () => this.disconnected(config, true))

		// When socket fails, set instance status and try to reconnect
		this.socket.on('error', () => this.disconnected(config, false))

		// When socket receives data, run corresponding callback
		this.socket.on('message', (raw) => {
			// Parse data
			let data = raw.toString()
			if (this.password) data = decrypt(data, this.password)

			// Parse JSON
			const json = JSON.parse(data)

			// Run callback
			if (json.resID in this.callbacks) {
				this.callbacks[json.resID](json)
				delete this.callbacks[json.resID]
			}
		})

		// Start state reload timer
		this.timerReloadState = setInterval(() => {
			// Get version
			this.send({ action: 'get-version' }, (data) => {
				this.setVariableValues({ version: data.version })
				this.checkFeedbacks(...feedbackVariants('version'))
			})

			// Get editor information
			this.send({ action: 'get-editor' }, (data) => {
				this.setVariableValues({
					language: data.editor?.document.languageId,
					lines: data.editor?.document.lineCount,
					tab_size: data.editor?.options.tabSize,
				})

				this.checkFeedbacks(
					...feedbackVariants('language'),
					...feedbackVariants('lines'),
					...feedbackVariants('tab_size')
				)
			})

			// Get status information
			this.send({ action: 'get-status' }, (data) => {
				for (const key in data.value) {
					this.setVariableValues({ [key]: data.value[key] })
					this.checkFeedbacks(...feedbackVariants(key))
				}
			})
		}, config.reloadState)

		// Start commands reload timer
		this.timerReloadCommands = setInterval(this.reloadCommands.bind(this), config.reloadCommands)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return CONFIG
	}

	disconnected(config: Config, graceful: boolean) {
		// Set instance status
		if (graceful) this.updateStatus(InstanceStatus.Disconnected)
		else this.updateStatus(InstanceStatus.ConnectionFailure)

		// Destroy old socket connection
		this.destroy()

		// Start reconnect timer
		if (config.reconnect) this.timerReconnect = setTimeout(() => this.configUpdated(config), config.reconnect)
	}

	send(data: any, callback: (data: any) => void) {
		// Check if socket is ready
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return

		// Prepare data
		data = { ...data, reqID: this.requestID++ }
		let json = JSON.stringify(data)
		if (this.password) json = encrypt(json, this.password)

		// Send data
		this.socket.send(json)

		// Set callback
		if (Object.keys(this.callbacks).length > 100) this.callbacks = {}
		this.callbacks[data.reqID] = callback
	}

	reloadCommands() {
		// Get commands
		this.send({ action: 'list-commands' }, (data) => {
			this.setVariableValues({ commands: data.list?.length })

			this.checkFeedbacks(...feedbackVariants('commands'))

			this.setActionDefinitions(
				generateActions(
					this.send.bind(this),
					this.setVariableValues.bind(this),
					this.reloadCommands.bind(this),
					data.list ?? []
				)
			)
		})
	}
}

runEntrypoint(ModuleInstance, [])
