import { describe, it, beforeAll, afterAll } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ID = "comida-familiar";

const FAMILIA_SEED = {
  miembros: {
    juanpablo: {
      nombre: "Juan Pablo",
      rol: "padre",
      mails: ["jpcofano@gmail.com"],
    },
    maria: {
      nombre: "María",
      rol: "madre",
      mails: ["marialascano@gmail.com", "maria.lascano@accenture.com"],
    },
    sofia: {
      nombre: "Sofía",
      rol: "hija",
      mails: ["sofiacofano@gmail.com"],
    },
    federico: {
      nombre: "Federico",
      rol: "hijo",
      mails: ["fedecofano1@gmail.com"],
    },
  },
  owner: "juanpablo",
  timezone: "America/Argentina/Buenos_Aires",
  semanaArrancaEn: "lunes",
};

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      host: "localhost",
      port: 8080,
    },
  });

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "config", "familia"), FAMILIA_SEED);
    await setDoc(doc(db, "config", "diccionarios"), { version: 1 });
    // Seed existing user docs needed for update/delete tests
    await setDoc(doc(db, "users", "maria-uid"), {
      uid: "maria-uid",
      email: "marialascano@gmail.com",
      memberId: "maria",
    });
    await setDoc(doc(db, "users", "jp-uid"), {
      uid: "jp-uid",
      email: "jpcofano@gmail.com",
      memberId: "juanpablo",
    });
    await setDoc(doc(db, "users", "sofia-uid"), {
      uid: "sofia-uid",
      email: "sofiacofano@gmail.com",
      memberId: "sofia",
    });
    await setDoc(doc(db, "users", "to-delete-uid"), {
      uid: "to-delete-uid",
      email: "fedecofano1@gmail.com",
      memberId: "federico",
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

// ─── Unauthenticated users ────────────────────────────────────────────────────

describe("unauthenticated user", () => {
  it("cannot read recetas", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "recetas", "REC-001")));
  });

  it("cannot read planes", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "planes", "PLAN-001")));
  });

  it("cannot read config/familia", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "config", "familia")));
  });

  it("cannot read users/*", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users", "any-uid")));
  });
});

// ─── Outsider (authenticated but not in whitelist) ────────────────────────────

describe("authenticated outsider (not in whitelist)", () => {
  const getOutsider = () =>
    testEnv
      .authenticatedContext("outsider-uid", { email: "hacker@evil.com" })
      .firestore();

  it("cannot read recetas", async () => {
    await assertFails(getDoc(doc(getOutsider(), "recetas", "REC-001")));
  });

  it("cannot write recetas", async () => {
    await assertFails(
      setDoc(doc(getOutsider(), "recetas", "REC-EVIL"), { nombre: "evil" })
    );
  });

  it("cannot read planes", async () => {
    await assertFails(getDoc(doc(getOutsider(), "planes", "PLAN-001")));
  });

  it("cannot read config/familia", async () => {
    await assertFails(getDoc(doc(getOutsider(), "config", "familia")));
  });
});

// ─── Family member — domain collections ──────────────────────────────────────

describe("family member (Maria, primary mail) — domain collections", () => {
  const getMaria = () =>
    testEnv
      .authenticatedContext("maria-uid", { email: "marialascano@gmail.com" })
      .firestore();

  it("can read recetas", async () => {
    await assertSucceeds(getDoc(doc(getMaria(), "recetas", "REC-001")));
  });

  it("can write recetas", async () => {
    await assertSucceeds(
      setDoc(doc(getMaria(), "recetas", "REC-MARIA-TEST"), { nombre: "test" })
    );
  });

  it("can read menus", async () => {
    await assertSucceeds(getDoc(doc(getMaria(), "menus", "MENU-001")));
  });

  it("can read planes", async () => {
    await assertSucceeds(getDoc(doc(getMaria(), "planes", "PLAN-001")));
  });

  it("can read historial", async () => {
    await assertSucceeds(getDoc(doc(getMaria(), "historial", "HIST-001")));
  });

  it("can read compras", async () => {
    await assertSucceeds(getDoc(doc(getMaria(), "compras", "LST-001")));
  });

  it("can read compras subcollection items", async () => {
    await assertSucceeds(
      getDoc(doc(getMaria(), "compras", "LST-001", "items", "ITEM-001"))
    );
  });

  it("can write compras subcollection items", async () => {
    await assertSucceeds(
      setDoc(doc(getMaria(), "compras", "LST-001", "items", "ITEM-MARIA-TEST"), {
        ingrediente: "test",
      })
    );
  });
});

// ─── Family member — secondary mail (alias) ───────────────────────────────────

describe("family member with secondary mail (Maria via Accenture alias)", () => {
  it("can read recetas with secondary mail", async () => {
    const db = testEnv
      .authenticatedContext("maria-uid-2", {
        email: "maria.lascano@accenture.com",
      })
      .firestore();
    await assertSucceeds(getDoc(doc(db, "recetas", "REC-001")));
  });
});

// ─── Family member — config access ───────────────────────────────────────────

describe("family member — config access", () => {
  const getMaria = () =>
    testEnv
      .authenticatedContext("maria-uid", { email: "marialascano@gmail.com" })
      .firestore();

  it("can read config/familia", async () => {
    await assertSucceeds(getDoc(doc(getMaria(), "config", "familia")));
  });

  it("can read config/diccionarios", async () => {
    await assertSucceeds(getDoc(doc(getMaria(), "config", "diccionarios")));
  });

  it("cannot write config/familia (non-owner)", async () => {
    await assertFails(
      setDoc(doc(getMaria(), "config", "familia"), FAMILIA_SEED)
    );
  });

  it("cannot write config/diccionarios (non-owner)", async () => {
    const getSofia = () =>
      testEnv
        .authenticatedContext("sofia-uid", { email: "sofiacofano@gmail.com" })
        .firestore();
    await assertFails(
      setDoc(doc(getSofia(), "config", "diccionarios"), { version: 2 })
    );
  });
});

// ─── Owner — config write ──────────────────────────────────────────────────────

describe("owner (JP) — config write", () => {
  const getJP = () =>
    testEnv
      .authenticatedContext("jp-uid", { email: "jpcofano@gmail.com" })
      .firestore();

  it("can write config/familia", async () => {
    await assertSucceeds(setDoc(doc(getJP(), "config", "familia"), FAMILIA_SEED));
  });

  it("can write config/diccionarios", async () => {
    await assertSucceeds(
      setDoc(doc(getJP(), "config", "diccionarios"), { version: 1 })
    );
  });
});

// ─── /users/{uid} ─────────────────────────────────────────────────────────────

describe("/users/{uid} access control", () => {
  it("member can read their own user doc", async () => {
    const db = testEnv
      .authenticatedContext("maria-uid", { email: "marialascano@gmail.com" })
      .firestore();
    await assertSucceeds(getDoc(doc(db, "users", "maria-uid")));
  });

  it("member cannot read another member's user doc", async () => {
    const db = testEnv
      .authenticatedContext("maria-uid", { email: "marialascano@gmail.com" })
      .firestore();
    await assertFails(getDoc(doc(db, "users", "jp-uid")));
  });

  it("member can create their own user doc", async () => {
    const db = testEnv
      .authenticatedContext("maria-uid", { email: "marialascano@gmail.com" })
      .firestore();
    await assertSucceeds(
      setDoc(doc(db, "users", "maria-uid"), {
        uid: "maria-uid",
        email: "marialascano@gmail.com",
        memberId: "maria",
      })
    );
  });

  it("member can update their own user doc", async () => {
    const db = testEnv
      .authenticatedContext("maria-uid", { email: "marialascano@gmail.com" })
      .firestore();
    await assertSucceeds(
      updateDoc(doc(db, "users", "maria-uid"), { ultimoLogin: new Date() })
    );
  });

  it("owner (JP) can update another member's user doc", async () => {
    const db = testEnv
      .authenticatedContext("jp-uid", { email: "jpcofano@gmail.com" })
      .firestore();
    await assertSucceeds(
      updateDoc(doc(db, "users", "maria-uid"), { ultimoLogin: new Date() })
    );
  });

  it("non-owner cannot update another member's user doc", async () => {
    const db = testEnv
      .authenticatedContext("sofia-uid", { email: "sofiacofano@gmail.com" })
      .firestore();
    await assertFails(
      updateDoc(doc(db, "users", "maria-uid"), { ultimoLogin: new Date() })
    );
  });

  it("owner can delete a user doc", async () => {
    const db = testEnv
      .authenticatedContext("jp-uid", { email: "jpcofano@gmail.com" })
      .firestore();
    await assertSucceeds(deleteDoc(doc(db, "users", "to-delete-uid")));
  });

  it("non-owner cannot delete a user doc", async () => {
    const db = testEnv
      .authenticatedContext("sofia-uid", { email: "sofiacofano@gmail.com" })
      .firestore();
    await assertFails(deleteDoc(doc(db, "users", "maria-uid")));
  });
});
