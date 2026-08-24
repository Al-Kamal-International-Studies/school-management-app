"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Table";
import type { Dictionary } from "@/lib/i18n/types";
import type { OutboundEmail } from "@/lib/types/database.types";

/**
 * Manual-relay UI for outbound_emails rows still stuck at status 'pending'
 * — the expected state until the client sets RESEND_API_KEY (see
 * src/lib/email/send.ts). Full to/subject/body_text is shown and copyable
 * so an admin can paste it into their own mail client in the meantime,
 * same spirit as the bulk-onboard scripts' "print credentials, hand over
 * manually" fallback, just surfaced in the app instead of a local file.
 */
export function PendingEmailsPanel({ emails, dict }: { emails: OutboundEmail[]; dict: Dictionary }) {
  if (emails.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500 dark:text-navy-400">{dict.admissions.noPendingEmails}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {emails.map((email) => (
        <PendingEmailCard key={email.id} email={email} dict={dict} />
      ))}
    </div>
  );
}

function PendingEmailCard({ email, dict }: { email: OutboundEmail; dict: Dictionary }) {
  const [copied, setCopied] = useState(false);

  const fullText = `${dict.admissions.to}: ${email.to_email}\n${dict.admissions.subjectLabel}: ${email.subject}\n\n${email.body_text}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be denied/unavailable — the text is still fully
      // visible and selectable below, so this is a non-fatal convenience.
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">
            <span className="font-semibold text-slate-700 dark:text-navy-100">{dict.admissions.to}: </span>
            <span className="text-slate-600 dark:text-navy-300">{email.to_email}</span>
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold text-slate-700 dark:text-navy-100">{dict.admissions.subjectLabel}: </span>
            <span className="text-slate-600 dark:text-navy-300">{email.subject}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-navy-700 dark:text-navy-200 dark:hover:bg-navy-800"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? dict.admissions.copied : dict.admissions.copy}
        </button>
      </div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-700 dark:bg-navy-800/60 dark:text-navy-200">
        {email.body_text}
      </pre>
    </Card>
  );
}
