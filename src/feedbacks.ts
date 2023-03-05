import { CompanionFeedbackDefinitions } from "@companion-module/base";

export function GetFeedbacks(getVariable: (name: string) => string | undefined): CompanionFeedbackDefinitions {
    return {
        language: {
            type: "boolean",
            name: "Current language",
            defaultStyle: {},
            options: [{ type: "textinput", label: "Language", id: "language", default: "plaintext" }],
            callback: (feedback) => getVariable("language") == feedback.options.language?.toString(),
            learn: () => ({ language: getVariable("language") }),
        },
    };
}
