import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

type Tipo = "comida" | "compras";

interface NotifPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * Envía push a todos los miembros con token registrado, respetando sus preferencias granulares.
 * @param excluir memberId a no notificar (ej. quien generó la compra rápida)
 */
export async function notificarFamilia(
  tipo: Tipo,
  payload: NotifPayload,
  excluir?: string,
) {
  const db = admin.firestore();
  const [tokensSnap, perfilesSnap] = await Promise.all([
    db.doc("config/pushTokens").get(),
    db.doc("config/perfiles").get(),
  ]);

  const tokensByMember = (tokensSnap.data() ?? {}) as Record<string, Record<string, true>>;
  const perfiles = (perfilesSnap.data() ?? {}) as Record<
    string,
    { notif?: { comida?: boolean; compras?: boolean } }
  >;

  const tokens: string[] = [];
  for (const [memberId, toks] of Object.entries(tokensByMember)) {
    if (memberId === excluir) continue;
    const pref = perfiles[memberId]?.notif;
    // Si no tiene preferencia seteada, default = true (opt-in al activar)
    const quiere = pref?.[tipo] ?? true;
    if (!quiere) continue;
    tokens.push(...Object.keys(toks));
  }

  if (!tokens.length) return;

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: { url: payload.url, tipo },
    webpush: { fcmOptions: { link: payload.url } },
  });
}
