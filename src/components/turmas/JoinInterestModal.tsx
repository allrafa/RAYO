import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { toast } from "sonner@2.0.3";

interface JoinInterestModalProps {
  open: boolean;
  onClose: () => void;
  turmaId: number;
  turmaTitle: string;
  // Task #99 — modal NÃO depende de AppContext pra poder ser usado
  // também na landing pública (sem AuthProvider). Quem chama autenticado
  // passa nome/e-mail pré-preenchidos; visitante anônimo digita.
  defaultName?: string;
  defaultEmail?: string;
}

interface InterestResponse {
  duplicated: boolean;
  courseTitle: string;
}

export function JoinInterestModal({
  open,
  onClose,
  turmaId,
  turmaTitle,
  defaultName = "",
  defaultEmail = "",
}: JoinInterestModalProps) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const res = await api.post<InterestResponse>(`/api/turmas/${turmaId}/interest`, {
      name: name.trim(),
      email: email.trim(),
      message: message.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.error?.message || "Não consegui registrar seu interesse. Tente de novo.");
      return;
    }
    if (res.data?.duplicated) {
      toast.success("Você já está na lista! Vamos te avisar assim que abrir.");
    } else {
      toast.success("Tudo certo! Avisaremos por e-mail quando a turma abrir.");
    }
    setMessage("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5" style={{ color: "var(--rayo-terra-500)" }} />
            <DialogTitle>Em breve!</DialogTitle>
          </div>
          <DialogDescription>
            A <strong>{turmaTitle}</strong> ainda não está aberta para inscrições. Deixe seus dados
            e a gente te avisa em primeira mão quando as vagas abrirem.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div>
            <label className="text-sm font-medium block mb-1">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">E-mail</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Mensagem <span className="text-xs text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="O que mais te interessa nessa turma?"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting} style={{ background: "var(--rayo-terra-500)" }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Avise-me"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
