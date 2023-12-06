import { CompanionVariableDefinition } from "@companion-module/base";

export function GetVariables(): CompanionVariableDefinition[] {
    return [
        { variableId: "version", name: "VSCode version" },
        { variableId: "language", name: "Language (current file)" },
        { variableId: "lines", name: "Line count (current file)" },
        { variableId: "commands", name: "Command count" },
        { variableId: "status_debug_active_session", name: "Status debug active session" },
        { variableId: "status_editor_column_number", name: "Status editor column number" },
        { variableId: "status_editor_document_name", name: "Status editor document name" },
        { variableId: "status_editor_encoding", name: "Status editor encoding" },
        { variableId: "status_editor_error_count", name: "Status editor error count" },
        { variableId: "status_editor_language_id", name: "Status editor LanguageId" },
        { variableId: "status_editor_line_number", name: "Status editor line number" },
        { variableId: "status_git_branch", name: "Status git branch" },
        { variableId: "status_workspace_name", name: "Status workspace name" },
    ];
}
