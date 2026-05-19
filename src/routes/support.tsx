import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CircleSlash,
  Download,
  Handshake,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Live Support - RageNodes" },
      { name: "description", content: "Create a RageNodes support ticket and chat with staff." },
    ],
  }),
  component: SupportPage,
});

type TicketState = {
  id: string;
  shortId: string;
  subject: string;
  status: string;
  category?: string;
  priority?: string;
  createdAt?: string;
  closedAt?: string | null;
  transcript?: TicketTranscript | null;
  token: string;
};

type TicketTranscript = {
  filename?: string;
  body?: string;
  generated_at?: string;
  closed_at?: string;
  entry_count?: number;
  attachments_count?: number;
};

type TicketMessage = {
  id: string;
  author_type: "customer" | "staff" | "system";
  author_name: string;
  message: string;
  created_at: string;
  attachments?: SupportAttachment[];
};

type SupportAttachment = {
  url: string;
  name?: string;
  content_type?: string | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  kind?: "image" | "video" | "file" | "sticker" | "embed";
};

const storageKey = "ragenodes_support_ticket";

function SupportPage() {
  const [ticket, setTicket] = useState<TicketState | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reply, setReply] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    discord: "",
    subject: "",
    category: "Technical",
    priority: "Normal",
    message: "",
  });

  const loadMessages = useCallback(async (activeTicket: TicketState) => {
    const response = await fetch(
      `/api/support/tickets/${activeTicket.id}/messages?token=${encodeURIComponent(
        activeTicket.token,
      )}`,
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return;
    setMessages(payload.messages ?? []);
    if (payload.ticket) {
      const nextTicket = { ...activeTicket, ...payload.ticket, token: activeTicket.token };
      setTicket((currentTicket) => {
        if (!currentTicket || currentTicket.id !== activeTicket.id) return currentTicket;
        if (
          currentTicket.shortId === nextTicket.shortId &&
          currentTicket.subject === nextTicket.subject &&
          currentTicket.status === nextTicket.status
        ) {
          return currentTicket;
        }
        return nextTicket;
      });
      window.localStorage.setItem(storageKey, JSON.stringify(nextTicket));
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      setTicket(JSON.parse(saved) as TicketState);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    if (ticket) return;

    const params = new URLSearchParams(window.location.search);
    const name = params.get("name");
    const email = params.get("email");
    const discord = params.get("discord");
    const subject = params.get("subject");
    const category = params.get("category");
    const priority = params.get("priority");
    const message = params.get("message");

    if (!name && !email && !discord && !subject && !category && !priority && !message) {
      return;
    }

    setForm((current) => ({
      ...current,
      name: name || current.name,
      email: email || current.email,
      discord: discord || current.discord,
      subject: subject || current.subject,
      category: category || current.category,
      priority: priority || current.priority,
      message: message || current.message,
    }));
  }, [ticket]);

  useEffect(() => {
    if (!ticket) return;
    void loadMessages(ticket);
    const interval = window.setInterval(() => void loadMessages(ticket), 5000);
    return () => window.clearInterval(interval);
  }, [loadMessages, ticket]);

  useEffect(() => {
    if (!ticket) return;
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ticket, messages]);

  const customerName = useMemo(() => form.name || "Customer", [form.name]);
  const ticketTranscript = ticket?.transcript ?? null;
  const canDownloadTranscript = Boolean(
    ticketTranscript?.body || (ticket?.status === "closed" && messages.length > 0),
  );

  const createTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      toast.error(payload.error || "Could not create ticket.");
      return;
    }

    const nextTicket = payload.ticket as TicketState;
    setMessages([]);
    setReply("");
    setTicket(nextTicket);
    window.localStorage.setItem(storageKey, JSON.stringify(nextTicket));
    toast.success(`Ticket ${nextTicket.shortId} created.`);
  };

  const sendReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticket || !reply.trim()) return;
    setSending(true);

    const response = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: ticket.token,
        name: customerName,
        message: reply,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSending(false);

    if (!response.ok) {
      toast.error(payload.error || "Could not send message.");
      return;
    }

    setReply("");
    await loadMessages(ticket);
  };

  const closeActiveTicket = async () => {
    if (!ticket || ticket.status === "closed") return;
    setClosing(true);

    const response = await fetch(`/api/support/tickets/${ticket.id}/close`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: ticket.token,
        name: customerName,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setClosing(false);

    if (!response.ok) {
      toast.error(payload.error || "Could not close ticket.");
      return;
    }

    if (payload.ticket) {
      const nextTicket = { ...ticket, ...payload.ticket, token: ticket.token } as TicketState;
      setTicket(nextTicket);
      window.localStorage.setItem(storageKey, JSON.stringify(nextTicket));
    }

    await loadMessages(ticket);
    toast.success("Ticket closed. Transcript saved.");
  };

  const downloadTranscript = () => {
    if (!ticket) return;

    const transcript =
      ticket.transcript?.body && ticket.transcript.filename
        ? ticket.transcript
        : buildClientTranscript(ticket, messages);

    if (!transcript.body) {
      toast.error("Transcript is not ready yet.");
      return;
    }

    const blob = new Blob([transcript.body], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = transcript.filename || `${ticket.shortId.toLowerCase()}-transcript.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const resetTicket = () => {
    setTicket(null);
    setMessages([]);
    window.localStorage.removeItem(storageKey);
  };

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-70" />
      <div className="absolute left-[12%] top-20 h-80 w-80 rounded-full bg-primary/12 blur-[120px]" />
      <div className="container relative mx-auto px-4 py-12 lg:py-16">
        <div className="mb-8 grid gap-3 md:grid-cols-3">
          <SignalPill
            icon={Sparkles}
            title="Premium support lane"
            text="Private ticket flow, Discord sync, and cleaner issue tracking."
          />
          <SignalPill
            icon={ShieldCheck}
            title="Transcript saved"
            text="When a ticket closes, the whole conversation is stored for later."
          />
          <SignalPill
            icon={Handshake}
            title="Partner ready"
            text="Billing, technical, and partner requests live in one support surface."
          />
        </div>

        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Live Support
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase md:text-6xl">Create a ticket</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Private live tickets with Discord sync, transcript saving, and a cleaner workflow for
              support, billing, and partner requests.
            </p>
          </div>
          {ticket && (
            <Button
              variant="ghost"
              onClick={resetTicket}
              className="h-11 rounded-xl bg-secondary/70"
            >
              <Plus className="h-4 w-4" />
              New ticket
            </Button>
          )}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[420px_1fr]">
          <div className="glass overflow-hidden rounded-2xl">
            {ticket ? (
              <TicketSummary ticket={ticket} />
            ) : (
              <form onSubmit={createTicket} className="space-y-4 p-6">
                <div className="rounded-2xl border border-primary/15 bg-primary/8 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                    Private lane
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Open one ticket and keep the whole conversation, media, and transcript in one
                    place.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <Field
                    label="Name"
                    value={form.name}
                    onChange={(name) => setForm({ ...form, name })}
                  />
                  <Field
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(email) => setForm({ ...form, email })}
                  />
                  <Field
                    label="Discord"
                    value={form.discord}
                    onChange={(discord) => setForm({ ...form, discord })}
                    required={false}
                  />
                  <Field
                    label="Subject"
                    value={form.subject}
                    onChange={(subject) => setForm({ ...form, subject })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Category"
                    value={form.category}
                    options={[
                      "Technical",
                      "Billing",
                      "Order",
                      "Server",
                      "Sponsorship",
                      "Partner",
                      "Other",
                    ]}
                    onChange={(category) => setForm({ ...form, category })}
                  />
                  <SelectField
                    label="Priority"
                    value={form.priority}
                    options={["Low", "Normal", "High", "Urgent"]}
                    onChange={(priority) => setForm({ ...form, priority })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    required
                    value={form.message}
                    onChange={(event) => setForm({ ...form, message: event.target.value })}
                    placeholder="Tell us what happened, your order/server details, or what you need for a partner request..."
                    className="min-h-36 rounded-xl bg-background/70"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {["Technical", "Billing", "Server", "Sponsorship", "Partner"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm({ ...form, category: preset })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        form.category === preset
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border/60 bg-secondary/45 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-primary font-bold"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LifeBuoy className="h-4 w-4" />
                  )}
                  Launch ticket
                </Button>
              </form>
            )}
          </div>

          <div className="glass flex h-[min(74vh,46rem)] min-h-[34rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(255,43,43,0.08),rgba(8,7,14,0)_24%),rgba(11,8,16,0.96)] sm:min-h-[38rem]">
            <div className="flex items-center justify-between gap-4 border-b border-white/6 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary shadow-[0_0_40px_rgba(255,43,43,0.15)]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Ticket chat</h2>
                  <p className="text-sm text-muted-foreground">
                    {ticket
                      ? `${ticket.shortId} / ${formatStatusLabel(ticket.status)}`
                      : "Create a ticket to start"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ticket ? <StatusBadge status={ticket.status} /> : null}
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
            </div>

            {ticket?.status === "closed" ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 bg-primary/7 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Ticket closed and archived
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Transcript is saved. You can download it or open a fresh ticket.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadTranscript}
                    disabled={!canDownloadTranscript}
                    className="rounded-xl"
                  >
                    <Download className="h-4 w-4" />
                    Transcript
                  </Button>
                  <Button type="button" onClick={resetTicket} className="rounded-xl bg-primary">
                    <Plus className="h-4 w-4" />
                    New ticket
                  </Button>
                </div>
              </div>
            ) : null}

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-3 p-5">
                {messages.length === 0 ? (
                  <div className="grid min-h-[360px] place-items-center text-center text-sm text-muted-foreground">
                    <div>
                      <img
                        src="/logo.png"
                        alt=""
                        className="mx-auto mb-4 h-12 w-12 object-contain"
                      />
                      Ticket messages will appear here. Discord replies, images, and closing
                      transcript all stay attached to this case.
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>

            {ticket?.status === "closed" ? (
              <div className="border-t border-white/6 bg-black/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-2">
                    {ticket.category ? <MetaChip label={ticket.category} /> : null}
                    {ticket.priority ? <MetaChip label={`${ticket.priority} priority`} /> : null}
                    <MetaChip label="Transcript saved" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={downloadTranscript}
                      disabled={!canDownloadTranscript}
                      className="h-8 rounded-lg px-3 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download transcript
                    </Button>
                    <Button
                      type="button"
                      onClick={resetTicket}
                      className="h-8 rounded-lg bg-primary px-3 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New ticket
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={sendReply} className="border-t border-white/6 bg-black/10 p-4">
                <div className="flex gap-3">
                  <Input
                    value={reply}
                    disabled={!ticket}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder={ticket ? "Write a reply..." : "Create a ticket first"}
                    className="h-12 rounded-xl border-white/8 bg-background/70"
                  />
                  <Button
                    type="submit"
                    disabled={!ticket || !reply.trim() || sending}
                    className="h-12 rounded-xl bg-primary px-5"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {ticket ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-2">
                      {ticket.category ? <MetaChip label={ticket.category} /> : null}
                      {ticket.priority ? <MetaChip label={`${ticket.priority} priority`} /> : null}
                      <MetaChip label="Discord synced" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={downloadTranscript}
                        disabled={!messages.length}
                        className="h-8 rounded-lg px-3 text-xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Draft transcript
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={closeActiveTicket}
                        disabled={closing || !ticket}
                        className="h-8 rounded-lg px-3 text-xs text-primary hover:text-primary"
                      >
                        {closing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CircleSlash className="h-3.5 w-3.5" />
                        )}
                        Close ticket
                      </Button>
                    </div>
                  </div>
                ) : null}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TicketSummary({ ticket }: { ticket: TicketState }) {
  return (
    <div className="p-6">
      <div className="rounded-b-3xl rounded-t-2xl border border-primary/15 bg-[linear-gradient(135deg,rgba(255,43,43,0.18),rgba(255,43,43,0.04)_55%,rgba(255,255,255,0.02))] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_40px_rgba(255,43,43,0.22)]">
            <LifeBuoy className="h-7 w-7" />
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <h2 className="mt-5 text-2xl font-black">{ticket.shortId}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{ticket.subject}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {ticket.category ? <MetaChip label={ticket.category} /> : null}
          {ticket.priority ? <MetaChip label={`${ticket.priority} priority`} /> : null}
          <MetaChip label={ticket.status === "closed" ? "Archived" : "Live sync"} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <InfoStrip label="Status" value={formatStatusLabel(ticket.status)} accent />
        <InfoStrip
          label="Transcript"
          value={ticket.transcript?.body ? "Saved and ready" : "Generated on close"}
        />
        <InfoStrip label="Opened" value={formatTicketDate(ticket.createdAt)} />
        <InfoStrip label="Closed" value={formatTicketDate(ticket.closedAt)} />
      </div>

      <p className="mt-5 text-sm leading-6 text-muted-foreground">
        This ticket stays private to this browser session token. When it is closed, the transcript
        remains attached and you can spin up a fresh case anytime.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl bg-background/70"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl bg-background/70 px-3 text-sm outline-none ring-ring focus-visible:ring-1"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function MessageBubble({ message }: { message: TicketMessage }) {
  const isCustomer = message.author_type === "customer";
  const isSystem = message.author_type === "system";
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  return (
    <div className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] ${
          isSystem
            ? "border-white/6 bg-secondary/45 text-center text-muted-foreground"
            : isCustomer
              ? "border-primary/30 bg-primary text-primary-foreground"
              : "border-white/6 bg-secondary/70"
        }`}
      >
        <p className="text-xs font-semibold opacity-75">{message.author_name}</p>
        {message.message ? (
          <div className="mt-1 whitespace-pre-wrap text-sm leading-6">
            <RenderedMessageText text={message.message} />
          </div>
        ) : null}
        {attachments.length > 0 ? (
          <div className="mt-3 space-y-3">
            {attachments.map((attachment, index) => (
              <AttachmentPreview
                key={`${attachment.url}-${index}`}
                attachment={attachment}
                isCustomer={isCustomer}
              />
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-[11px] opacity-60">
          {new Date(message.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function RenderedMessageText({ text }: { text: string }) {
  const parts = text.split(/(<a?:[a-zA-Z0-9_]+:\d+>)/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^<(a?):([a-zA-Z0-9_]+):(\d+)>$/);
        if (!match) return <span key={`${part}-${index}`}>{part}</span>;

        const [, animated, name, emojiId] = match;
        const ext = animated ? "gif" : "png";
        return (
          <img
            key={`${emojiId}-${index}`}
            src={`https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=64&quality=lossless`}
            alt={name}
            className="mx-1 inline-block h-6 w-6 align-text-bottom"
          />
        );
      })}
    </>
  );
}

function AttachmentPreview({
  attachment,
  isCustomer,
}: {
  attachment: SupportAttachment;
  isCustomer: boolean;
}) {
  const url = attachment.url;
  const contentType = attachment.content_type || "";
  const kind = attachment.kind || "file";
  const isImage =
    kind === "image" ||
    kind === "sticker" ||
    kind === "embed" ||
    contentType.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(url);
  const isVideo =
    kind === "video" || contentType.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(url);

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img
          src={url}
          alt={attachment.name || "attachment"}
          className={`max-h-72 rounded-xl object-contain ${isCustomer ? "bg-black/10" : "bg-black/20"}`}
        />
      </a>
    );
  }

  if (isVideo) {
    return (
      <video controls className="max-h-80 rounded-xl">
        <source src={url} type={contentType || undefined} />
      </video>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex rounded-xl bg-black/10 px-3 py-2 text-xs underline-offset-2 hover:underline"
    >
      {attachment.name || "Open attachment"}
    </a>
  );
}

function SignalPill({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Sparkles;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-secondary/35 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isClosed = status === "closed";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        isClosed
          ? "border-white/10 bg-secondary/70 text-muted-foreground"
          : "border-primary/35 bg-primary/12 text-primary"
      }`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs font-semibold text-muted-foreground">
      {label}
    </span>
  );
}

function InfoStrip({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        accent ? "border-primary/20 bg-primary/8" : "border-white/6 bg-secondary/30"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-sm font-semibold ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function formatStatusLabel(status: string) {
  if (status === "waiting_staff") return "Waiting Staff";
  if (status === "waiting_customer") return "Waiting Customer";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTicketDate(value?: string | null) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString();
}

function buildClientTranscript(ticket: TicketState, messages: TicketMessage[]) {
  const lines = [
    `Ticket: ${ticket.shortId}`,
    `Subject: ${ticket.subject}`,
    `Category: ${ticket.category || "-"}`,
    `Priority: ${ticket.priority || "-"}`,
    `Created: ${ticket.createdAt || "-"}`,
    `Closed: ${ticket.closedAt || "-"}`,
    "",
  ];

  for (const message of messages) {
    lines.push(
      `[${message.created_at}] ${message.author_name} (${message.author_type})`,
      message.message || "(attachment only)",
    );

    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    if (attachments.length > 0) {
      lines.push("Attachments:");
      for (const attachment of attachments) {
        lines.push(
          `- ${attachment.name || "attachment"}${attachment.url ? `: ${attachment.url}` : ""}`,
        );
      }
    }

    lines.push("");
  }

  return {
    filename: `${ticket.shortId.toLowerCase()}-transcript.txt`,
    body: lines.join("\n").trim(),
  };
}
