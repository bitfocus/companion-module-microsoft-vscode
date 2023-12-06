import { CompanionFeedbackDefinitions,
         CompanionVariableDefinition } from "@companion-module/base";

import { GetVariables } from "./variables";

// Generate default feedback entries for "status_" variables
export function GenerateStatusFeedback(
    variables: CompanionVariableDefinition[],
    getVariable: (name: string) => string | undefined
): CompanionFeedbackDefinitions {
    const feedbackEntries: CompanionFeedbackDefinitions = {};

    variables.forEach(variable => {
        if (variable.variableId && variable.variableId.startsWith("status_")) {
            const feedbackEntryKey = variable.variableId;
            feedbackEntries[feedbackEntryKey] = {
                type: "boolean",
                name: variable.name,
                defaultStyle: {},
                options: [{ type: "textinput", label: variable.name, id: feedbackEntryKey, default: "plaintext" }],
                callback: (feedback: { [key: string]: any }) => {
                    return getVariable(feedbackEntryKey) === feedback.options[feedbackEntryKey]?.toString();
                },
                learn: () => ({ [feedbackEntryKey]: getVariable(feedbackEntryKey) }),
            };
        }
    });

    return feedbackEntries;
}

export function GetFeedbacks(getVariable: (name: string) => string | undefined): CompanionFeedbackDefinitions {
    const defaultFeedbacks: CompanionFeedbackDefinitions = {
        language: {
            type: "boolean",
            name: "Current language",
            defaultStyle: {},
            options: [{
                type: "textinput",
                label: "Language",
                id: "language",
                default: "plaintext"
            }],
            callback: (feedback) =>
                getVariable("language") === feedback.options.language?.toString(),
            learn: () => ({ language: getVariable("language") }),
        },
    };

    // Call GenerateStatusFeedback to get status-related feedback entries
    const statusFeedbacks = GenerateStatusFeedback(GetVariables(), getVariable);

    // Merge statusFeedbacks into defaultFeedbacks
    for (const statusFeedbackKey of Object.keys(statusFeedbacks)) {
        defaultFeedbacks[statusFeedbackKey] = statusFeedbacks[statusFeedbackKey];
    }

    return defaultFeedbacks;
}
