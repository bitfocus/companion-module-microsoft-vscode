import { CompanionFeedbackDefinitions } from '@companion-module/base'
import { booleanVariables, numberVariables, stringVariables } from './variables'

export function feedbackVariants(id: string): string[] {
	let def = stringVariables.find((v) => v.variableId === id)
	if (def) return [id + '_equals', id + '_contains', id + '_matches']

	def = numberVariables.find((v) => v.variableId === id)
	if (def) return [id + '_equals', id + '_greater', id + '_less', id + '_between']

	def = booleanVariables.find((v) => v.variableId === id)
	if (def) return [id]

	return []
}

export function generateFeedbacks(getVar: (name: string) => string | undefined): CompanionFeedbackDefinitions {
	let feedbacks: CompanionFeedbackDefinitions = {}

	for (const variable of stringVariables) {
		const id = variable.variableId
		const name = variable.name

		feedbacks[id + '_equals'] = {
			type: 'boolean',
			name: name + ' equals...',
			description: `Applies when ${name} equals the specified value`,
			defaultStyle: {},
			options: [{ type: 'textinput', label: 'Value', id: 'value', default: '' }],
			callback: (fb) => getVar(id) === fb.options.value?.toString(),
			learn: () => ({ value: getVar(id) }),
		}

		feedbacks[id + '_contains'] = {
			type: 'boolean',
			name: name + ' contains...',
			description: `Applies when ${name} contains the specified value`,
			defaultStyle: {},
			options: [{ type: 'textinput', label: 'Value', id: 'value', default: '' }],
			callback: (fb) => getVar(id)?.includes(fb.options.value?.toString() ?? '') ?? false,
		}

		feedbacks[id + '_matches'] = {
			type: 'boolean',
			name: name + ' matches...',
			description: `Applies when ${name} matches the specified regular expression`,
			defaultStyle: {},
			options: [{ type: 'textinput', label: 'RegExp', id: 'value', default: '^.*$' }],
			callback: (fb) => new RegExp(fb.options.value?.toString() ?? '^.*$').test(getVar(id) ?? ''),
		}
	}

	for (const variable of numberVariables) {
		const id = variable.variableId
		const name = variable.name

		feedbacks[id + '_equals'] = {
			type: 'boolean',
			name: name + ' equals...',
			description: `Applies when ${name} equals the specified value`,
			defaultStyle: {},
			options: [{ type: 'number', label: 'Value', id: 'value', default: 0, min: -1e9, max: 1e9 }],
			callback: (fb) => getVar(id) === fb.options.value?.toString(),
			learn: () => ({ value: getVar(id) }),
		}

		feedbacks[id + '_greater'] = {
			type: 'boolean',
			name: name + ' greater than...',
			description: `Applies when ${name} is greater than the specified value`,
			defaultStyle: {},
			options: [{ type: 'number', label: 'Value', id: 'value', default: 0, min: -1e9, max: 1e9 }],
			callback: (fb) => parseInt(getVar(id) ?? '0') > parseInt(fb.options.value?.toString() ?? '0'),
			learn: () => ({ value: getVar(id) }),
		}

		feedbacks[id + '_less'] = {
			type: 'boolean',
			name: name + ' less than...',
			description: `Applies when ${name} is less than the specified value`,
			defaultStyle: {},
			options: [{ type: 'number', label: 'Value', id: 'value', default: 0, min: -1e9, max: 1e9 }],
			callback: (fb) => parseInt(getVar(id) ?? '0') < parseInt(fb.options.value?.toString() ?? '0'),
			learn: () => ({ value: getVar(id) }),
		}

		feedbacks[id + '_between'] = {
			type: 'boolean',
			name: name + ' between...',
			description: `Applies when ${name} is between the specified values`,
			defaultStyle: {},
			options: [
				{ type: 'number', label: 'Minimum', id: 'min', default: 0, min: -1e9, max: 1e9 },
				{ type: 'number', label: 'Maximum', id: 'max', default: 0, min: -1e9, max: 1e9 },
			],
			callback: (fb) =>
				parseInt(getVar(id) ?? '0') > parseInt(fb.options.min?.toString() ?? '0') &&
				parseInt(getVar(id) ?? '0') < parseInt(fb.options.max?.toString() ?? '0'),
		}
	}

	for (const variable of booleanVariables) {
		const id = variable.variableId
		const name = variable.name

		feedbacks[id] = {
			type: 'boolean',
			name: name,
			description: `Applies when ${name} is true/false`,
			defaultStyle: {},
			options: [{ type: 'checkbox', label: 'Value', id: 'value', default: true }],
			callback: (fb) => getVar(id) === fb.options.value?.toString(),
			learn: () => ({ value: getVar(id) === 'true' }),
		}
	}

	return feedbacks
}
