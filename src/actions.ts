import { CompanionActionDefinitions, DropdownChoice } from "@companion-module/base";

export class Actions {
    private setActions: (actions: CompanionActionDefinitions) => void;
    private runCommand: (command: string) => void;
    private groupedCommands: Map<string, DropdownChoice[]> = new Map();
    private commandsString: string = "";

    constructor(setActions: (actions: CompanionActionDefinitions) => void, runCommand: (command: string) => void) {
        this.setActions = setActions;
        this.runCommand = runCommand;
    }

    setCommands(commands: string[]) {
        // Only update when command list changed
        const str = JSON.stringify(commands);
        if (str == this.commandsString) return;
        this.commandsString = str;

        // Clear commands
        this.groupedCommands.clear();

        // Fill commands
        for (const command of commands) {
            // Get key from command
            const period = command.indexOf(".");
            const key = period === -1 ? "default" : command.substring(0, period);

            // Make sure array exists
            if (!this.groupedCommands.has(key)) this.groupedCommands.set(key, []);

            // Add command to array
            const name = command.substring(period + 1);
            this.groupedCommands.get(key)?.push({ id: name, label: name });
        }

        // Regenerate actions
        this.setActions({ ...this.getOtherActions(), ...this.getCommandActions() });
    }

    getCommandActions(): CompanionActionDefinitions {
        // Create actions
        let actions: CompanionActionDefinitions = {};

        // Fill actions
        for (const group of this.groupedCommands.keys()) {
            actions["run_command_" + group] = {
                name: `Run ${group} command`,
                options: [
                    {
                        id: "command",
                        type: "dropdown",
                        label: "Command",
                        choices: this.groupedCommands.get(group)!,
                        default: this.groupedCommands.get(group)![0].id,
                    },
                ],
                callback: (action) =>
                    this.runCommand(
                        (group === "default" ? "" : group + ".") + action.options.command?.toString() ?? "noop"
                    ),
            };
        }

        // Return actions
        return actions;
    }

    getOtherActions(): CompanionActionDefinitions {
        return {};
    }
}
