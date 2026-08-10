import { Link } from "react-router-dom";

type PlaceholderProps = {
  title: string;
};

export default function Placeholder({ title }: PlaceholderProps) {
  return (
    <main className="min-h-screen bg-[#f8faf9] px-5 pb-10 text-ink sm:px-8">
      <div className="mx-auto max-w-[1060px]">
        <header className="flex items-center justify-between py-5 sm:py-7">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-teal text-sm font-extrabold text-white shadow-sm">
              L
            </span>
            <span className="text-[17px] font-extrabold tracking-[-0.03em] text-navy">
              LocalWorker
            </span>
          </Link>
        </header>
        <section className="rounded-[18px] border border-[#dcece7] bg-[#edf7f3] px-5 py-10 sm:px-10 sm:py-14">
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-navy sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-6 text-slate">
            This page is ready for its next step.
          </p>
          <Link
            to="/"
            className="mt-7 inline-flex h-11 items-center rounded-[10px] bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-[#234b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          >
            Back to Home
          </Link>
        </section>
      </div>
    </main>
  );
}
