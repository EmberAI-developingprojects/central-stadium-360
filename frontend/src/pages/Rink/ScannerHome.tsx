import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { keepSignedInOnThisDevice } from "../../lib/session";

// Landing page for rink staff: scan tickets, or turn this device into the
// LED board. Admins reach it too, with a way back to the admin panel.
export default function ScannerHome() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const openBoard = () => {
    // The board stays signed in across restarts of the LED computer.
    keepSignedInOnThisDevice();
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    navigate("/scanner/board");
  };

  return (
    <div className="min-h-[100svh] bg-zinc-950 text-white flex flex-col">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <img
          src="/assets/images/brand/logo-white.png"
          alt="Төв Цэнгэлдэх Хүрээлэн"
          className="h-8 w-auto"
        />
        <div className="flex-1" />
        <div className="text-right text-[13px] leading-tight">
          <div className="font-semibold">{session?.fullname || session?.identifier}</div>
          <div className="text-white/50">
            {session?.role === "admin" ? "Админ" : "Тасалбар шалгагч"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout().then(() => navigate("/login", { replace: true }))}
          className="ml-2 rounded-lg bg-transparent border border-solid border-white/15 px-3 py-2 text-[13px] text-white/80 hover:bg-white/10 cursor-pointer"
        >
          Гарах
        </button>
      </header>

      <main className="flex-1 grid place-items-center px-5 py-8">
        <div className="w-full max-w-[440px] flex flex-col gap-4">
          <h1 className="text-[22px] font-bold text-center mb-2">Мөсөн гулгуур</h1>
          <Link
            to="/scanner/scan"
            className="flex items-center gap-4 rounded-2xl bg-white text-zinc-950 px-6 py-6 no-underline shadow-lg active:scale-[0.99] transition"
          >
            <svg viewBox="0 0 24 24" className="w-10 h-10 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
            </svg>
            <span>
              <span className="block text-[19px] font-bold">Тасалбар уншуулах</span>
              <span className="block text-[13.5px] text-zinc-500">Орохдоо цаг эхлүүлэх, гарахдаа дуусгах</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={openBoard}
            className="flex items-center gap-4 rounded-2xl bg-white/10 border border-solid border-white/15 text-white px-6 py-6 text-left active:scale-[0.99] transition cursor-pointer font-[inherit]"
          >
            <svg viewBox="0 0 24 24" className="w-10 h-10 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="2" y="4" width="20" height="13" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <span>
              <span className="block text-[19px] font-bold">LED дэлгэц</span>
              <span className="block text-[13.5px] text-white/60">Гулгаж буй хүмүүсийн үлдсэн хугацааг бүтэн дэлгэцээр</span>
            </span>
          </button>
          {session?.role === "admin" && (
            <Link to="/admin/rink" className="text-center text-[13.5px] text-white/60 hover:text-white mt-2">
              ← Админ хуудас руу буцах
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
