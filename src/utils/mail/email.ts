import { Resend } from "resend";
import { generateUnsubscribeToken } from "./unsubscribe";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendwaitListConfirmation(email: string) {
  const token = generateUnsubscribeToken(email);
  const unsubscribeUrl = `https://maturamate.it/unsubscribe?email=${encodeURIComponent(
    email
  )}&token=${token}`;

  return resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: email,
    subject: "🎓 Sei nella lista d'attesa di MaturaMate!",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e90ff;">Grazie per esserti registrato!</h1>
        <p>Ciao 👋</p>
        <p>Hai fatto il primo passo verso una maturità senza stress.</p>
        <p><strong>MaturaMate</strong> ti aiuterà a prepararti con simulazioni d'esame, esercizi mirati e spiegazioni chiare come non mai.</p>
        <p>Ti faremo sapere appena la piattaforma sarà completata!</p>
        <p>Nel frattempo, puoi seguirci o consigliare MaturaMate ai tuoi amici. 😉</p>
        <p style="margin-top: 30px;">A presto,<br><strong>Il team di MaturaMate</strong></p>
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #888;">
          Ricevi questa email perché ti sei iscritto alla lista d'attesa su maturamate.it
        </p>
        <p style="font-size: 12px; color: #888;">
          Non vuoi più ricevere email da noi?
          <a href="${unsubscribeUrl}">Clicca qui per disiscriverti</a>.
        </p>
      </div>
    `,
  });
}
