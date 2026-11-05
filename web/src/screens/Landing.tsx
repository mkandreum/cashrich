import { useState, type FormEvent } from 'react';
import { createRoom, fetchRoom, joinRoom, saveSession } from '../lib/api';
import { sfx } from '../lib/sound';
import { JoinForm } from '../components/JoinForm';
import { Logo } from '../components/Logo';
import { navigate } from '../App';

const STEPS = [
  ['💼', 'Empiezas atrapado', 'Te toca una profesión con sueldo y gastos. Vives al día, en el barrio.'],
  ['📈', 'Opera con cabeza', 'Compra en la recesión, vende en la burbuja. Los precios y el crédito cambian con la economía.'],
  ['🔨', 'Subasta y pelea', 'Si pasas de una oferta sale a subasta entre rivales, y tú te quedas la prima.'],
  ['🔓', 'Escapa', 'Cuando tus rentas cubren tus gastos, saltas a la Avenida del Legado.'],
  ['⭐', 'Compra tu Legado', 'El primero en pagarse su Legado gana. Cuidado con los caprichos y las deudas.'],
];

export function Landing() {
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function join(e: FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 4) return;
    sfx.tap();
    const room = await fetchRoom(clean);
    if (!room) { setError(`No hay ninguna mesa con el código ${clean}.`); return; }
    navigate(`/m/${clean}`);
  }

  async function create(name: string, avatar: string) {
    const { code: newCode } = await createRoom();
    const seat = await joinRoom(newCode, name, avatar);
    saveSession(newCode, seat);
    navigate(`/m/${newCode}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center px-4 pb-10 pt-[max(2rem,6vh)]">
      <div className="relative mb-1 flex w-full justify-center">
        <span aria-hidden className="float-slow absolute left-[6%] top-1 text-5xl md:text-7xl">🪙</span>
        <span aria-hidden className="float-slow absolute right-[6%] top-8 text-4xl md:text-6xl [animation-delay:-2s]">🐭</span>
        <Logo className="text-center text-[clamp(3.6rem,15vw,8.5rem)]" />
      </div>
      <p className="mt-4 max-w-xl text-center text-xl font-medium leading-snug text-cream">
        Sal del barrio, haz que tu dinero trabaje y compra tu Legado antes que tus amigos.
      </p>
      <p className="mt-1 text-center font-semibold text-gold">Online · 2 a 6 jugadores · cada uno desde su móvil</p>

      {creating ? (
        <div className="mt-7 flex w-full flex-col items-center gap-2">
          <JoinForm title="Abre tu mesa" cta="Crear mesa" onSubmit={create} />
          <button className="font-semibold underline underline-offset-4" onClick={() => setCreating(false)}>Volver</button>
        </div>
      ) : (
        <div className="mt-7 grid w-full max-w-3xl gap-4 md:grid-cols-2">
          <section className="panel flex flex-col p-5">
            <h2 className="font-display text-2xl">Nueva partida</h2>
            <p className="mb-4 mt-1 flex-1 text-ink/75">Crea una mesa y pasa el enlace por WhatsApp a quien quieras retar.</p>
            <button className="btn btn-coral btn-giant" onClick={() => { sfx.tap(); setCreating(true); }}>Crear mesa</button>
          </section>
          <form className="panel flex flex-col p-5" onSubmit={join}>
            <label className="font-display text-2xl" htmlFor="room-code">Tengo un código</label>
            <input
              id="room-code" value={code} maxLength={4} placeholder="ABCD" autoCapitalize="characters" autoComplete="off"
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
              className="mb-4 mt-2 w-full flex-1 rounded-xl border-[3px] border-ink bg-white px-3 py-2 text-center font-display text-4xl tracking-[0.3em] outline-none placeholder:text-ink/25"
            />
            {error && <p role="alert" className="mb-3 -mt-2 font-semibold text-coral-dark">{error}</p>}
            <button className="btn btn-sky btn-giant" disabled={code.trim().length !== 4}>Entrar</button>
          </form>
        </div>
      )}

      <section className="mt-12 w-full" aria-labelledby="how-to">
        <h2 id="how-to" className="sticker text-center text-4xl text-cream">Cómo se juega</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map(([icon, title, text]) => (
            <li key={title} className="panel-dark p-4">
              <span aria-hidden className="text-4xl">{icon}</span>
              <h3 className="mt-1 font-display text-xl">{title}</h3>
              <p className="mt-1 leading-snug text-cream/85">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-10 text-center text-sm text-cream/70">
        Juego original de educación financiera.
      </footer>
    </main>
  );
}
