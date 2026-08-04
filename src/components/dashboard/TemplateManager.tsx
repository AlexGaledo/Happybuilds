"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Power, Trash2 } from "lucide-react";
import type { MessageTemplate, TemplateInput } from "@/lib/dashboard/types";
import {
  deleteTemplateAction,
  saveTemplateAction,
  type ActionResult,
} from "@/lib/dashboard/actions";
import { Chip, EmptyState } from "./primitives";
import { cn } from "@/lib/utils";

const BLANK: TemplateInput = {
  name: "",
  subject: "",
  body: "",
  when_to_use: "",
  tags: [],
  is_active: true,
};

/**
 * The pool the drafting agent picks from.
 *
 * Every active template is put in front of the agent on every batch, and it
 * chooses one by id. That makes `when_to_use` the load-bearing field — it is
 * what the model actually selects on — so the editor gives it equal weight to
 * the body rather than treating it as a note.
 *
 * Deactivating is offered alongside deleting because a template that stops
 * working is usually worth keeping to edit, and drafts already written from it
 * reference it by id.
 */
export function TemplateManager({ templates }: { templates: MessageTemplate[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ id: string | null; values: TemplateInput } | null>(
    null,
  );
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  function run(work: () => Promise<ActionResult>, okText: string, close = false) {
    setFeedback(null);
    startTransition(async () => {
      const result = await work();
      setFeedback(
        result.ok
          ? { tone: "ok", text: okText }
          : { tone: "error", text: result.error ?? "Something went wrong" },
      );
      if (result.ok) {
        if (close) setEditing(null);
        router.refresh();
      }
    });
  }

  function toInput(t: MessageTemplate): TemplateInput {
    return {
      name: t.name,
      subject: t.subject,
      body: t.body,
      when_to_use: t.when_to_use,
      tags: t.tags ?? [],
      is_active: t.is_active,
    };
  }

  const active = templates.filter((t) => t.is_active).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing({ id: null, values: { ...BLANK } })}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus aria-hidden className="size-4" />
          New template
        </button>
        <p className="text-xs text-muted">
          {active} of {templates.length} active — the agent only sees active ones.
        </p>
        <p
          aria-live="polite"
          className={cn(
            "text-xs",
            feedback?.tone === "error" ? "text-coral-ink" : "text-mint-ink",
          )}
        >
          {feedback?.text ?? ""}
        </p>
      </div>

      {active === 0 && templates.length > 0 && (
        <div
          role="note"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm leading-relaxed text-amber-ink"
        >
          <strong className="font-semibold">Every template is inactive.</strong>{" "}
          Processing will refuse to run — the agent has nothing to choose from.
          Reactivate at least one.
        </div>
      )}

      {editing && (
        <Editor
          key={editing.id ?? "new"}
          initial={editing.values}
          isNew={editing.id === null}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSave={(values) =>
            run(
              () => saveTemplateAction(editing.id, values),
              editing.id ? "Template saved." : "Template created.",
              true,
            )
          }
        />
      )}

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="The drafting agent picks one template per lead from this pool. Add at least one before processing."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {templates.map((template) => (
            <li key={template.id}>
              <TemplateCard
                template={template}
                pending={pending}
                onEdit={() =>
                  setEditing({ id: template.id, values: toInput(template) })
                }
                onToggleActive={() =>
                  run(
                    () =>
                      saveTemplateAction(template.id, {
                        ...toInput(template),
                        is_active: !template.is_active,
                      }),
                    template.is_active ? "Deactivated." : "Activated.",
                  )
                }
                onDelete={() =>
                  run(() => deleteTemplateAction(template.id), "Template deleted.")
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  pending,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  template: MessageTemplate;
  pending: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <article
      data-testid="template-card"
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border bg-surface p-4 shadow-soft",
        !template.is_active && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-sm font-bold">{template.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted">{template.subject}</p>
        </div>
        {!template.is_active && <Chip tone="muted">Inactive</Chip>}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {template.origin === "preloaded" && <Chip tone="muted">Preloaded</Chip>}
        {(template.tags ?? []).map((tag) => (
          <Chip key={tag} tone="neutral">
            {tag}
          </Chip>
        ))}
        {template.times_used > 0 && (
          <Chip tone="mint">Used {template.times_used}×</Chip>
        )}
      </div>

      {template.when_to_use ? (
        <p className="mt-2.5 rounded-lg bg-navy-800/[0.04] px-2.5 py-2 text-[11px] leading-relaxed text-muted dark:bg-white/5">
          <span className="font-semibold uppercase tracking-[0.08em]">When: </span>
          {template.when_to_use}
        </p>
      ) : (
        <p className="mt-2.5 text-[11px] leading-relaxed text-amber-ink">
          No “when to use” — the agent has nothing to select on and will pick
          this one on style alone.
        </p>
      )}

      <pre className="mt-2.5 max-h-32 flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-border p-2.5 font-mono text-[11px] leading-relaxed text-muted">
        {template.body}
      </pre>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <Action onClick={onEdit} disabled={pending}>
          Edit
        </Action>
        <Action onClick={onToggleActive} disabled={pending}>
          <Power aria-hidden className="size-3.5" />
          {template.is_active ? "Deactivate" : "Activate"}
        </Action>
        {confirming ? (
          <>
            <Action onClick={onDelete} disabled={pending} tone="danger">
              Confirm delete
            </Action>
            <Action onClick={() => setConfirming(false)}>Cancel</Action>
          </>
        ) : (
          // Two-step because delete is irreversible and these sit next to Edit.
          <Action onClick={() => setConfirming(true)} disabled={pending} tone="danger">
            <Trash2 aria-hidden className="size-3.5" />
            <span className="sr-only">Delete template</span>
          </Action>
        )}
      </div>
    </article>
  );
}

function Editor({
  initial,
  isNew,
  pending,
  onSave,
  onCancel,
}: {
  initial: TemplateInput;
  isNew: boolean;
  pending: boolean;
  onSave: (values: TemplateInput) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<TemplateInput>(initial);
  const [tagText, setTagText] = useState(initial.tags.join(", "));

  const valid =
    values.name.trim().length > 0 &&
    values.subject.trim().length > 0 &&
    values.body.trim().length > 0;

  function set<K extends keyof TemplateInput>(key: K, value: TemplateInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...values,
          name: values.name.trim(),
          subject: values.subject.trim(),
          body: values.body.trim(),
          when_to_use: values.when_to_use.trim(),
          tags: tagText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        });
      }}
      className="rounded-2xl border border-border bg-surface p-4 shadow-soft"
    >
      <h2 className="font-display text-base font-bold">
        {isNew ? "New template" : "Edit template"}
      </h2>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Name" hint="Unique. Shown to the agent when it chooses.">
          <input
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={120}
            required
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:text-sm"
          />
        </Field>
        <Field label="Subject" hint="Placeholders allowed, e.g. {{role_title}}.">
          <input
            value={values.subject}
            onChange={(e) => set("subject", e.target.value)}
            maxLength={200}
            required
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:text-sm"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field
          label="When to use"
          hint="The condition the agent selects on. Be specific — this matters more than the body."
        >
          <textarea
            value={values.when_to_use}
            onChange={(e) => set("when_to_use", e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="A scraped job post for repetitive manual work: data entry, order processing, report building…"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:text-sm"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field
          label="Message body"
          hint="Use {{placeholders}} for anything the agent should fill from the lead. It replaces them with judgement, not a string swap."
        >
          <textarea
            value={values.body}
            onChange={(e) => set("body", e.target.value)}
            rows={8}
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:text-xs"
          />
        </Field>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Tags" hint="Comma separated. For your own filtering.">
          <input
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder="listing, automation"
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-coral-500 pointer-fine:text-sm"
          />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm md:self-end">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="size-4 accent-coral-500"
          />
          Active — include in the agent&rsquo;s pool
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || !valid}
          className="inline-flex min-h-11 items-center rounded-full bg-navy-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isNew ? "Create" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-muted hover:bg-navy-800/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 dark:hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Action({
  onClick,
  disabled,
  tone = "neutral",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // See DraftsBoard.SmallButton — icon-only Delete needs the width too.
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors pointer-fine:min-h-9 pointer-fine:min-w-0 pointer-fine:px-2.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tone === "danger"
          ? "text-coral-ink hover:bg-coral-500/10"
          : "text-muted hover:bg-navy-800/6 hover:text-foreground dark:hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
          {hint}
        </span>
      )}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
