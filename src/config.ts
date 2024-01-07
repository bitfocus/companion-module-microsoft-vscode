import { Regex, SomeCompanionConfigField } from '@companion-module/base'

export type Config = {
	host: string
	port: number
	password: string
	reconnect: number
	reloadCommands: number
	reloadState: number
}

export const CONFIG: SomeCompanionConfigField[] = [
	{
		id: 'host',
		type: 'textinput',
		label: 'Target IP',
		width: 6,
		default: '127.0.0.1',
		required: true,
		regex: Regex.IP,
	},
	{
		id: 'port',
		type: 'number',
		label: 'Target Port',
		width: 6,
		default: 6783,
		required: true,
		min: 0,
		max: 65535,
	},
	{
		id: 'password',
		type: 'textinput',
		label: 'Password',
		width: 6,
		default: '',
		required: false,
	},
	{
		id: 'reconnect',
		type: 'number',
		label: 'Reconnect delay (ms, 0 to disable)',
		width: 6,
		default: 5000,
		required: true,
		min: 0,
		max: 60000,
	},
	{
		id: 'reloadCommands',
		type: 'number',
		label: 'Command fetch delay (ms)',
		width: 6,
		default: 60000,
		required: true,
		min: 100,
		max: 3600000,
	},
	{
		id: 'reloadState',
		type: 'number',
		label: 'State fetch delay (ms)',
		width: 6,
		default: 500,
		required: true,
		min: 100,
		max: 60000,
	},
]
