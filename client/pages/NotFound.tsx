import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Compass } from "lucide-react";
import PageShell from "@/components/PageShell";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <PageShell backTo="/home" backLabel="Home" containerWidth="sm">
      <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] p-8 sm:p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCEAE4] dark:bg-[#3A2018] text-[#F4512C]">
          <Compass size={28} />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
          Error 404
        </span>
        <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141210] dark:text-[#FAFAFA]">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-[#6B645F] dark:text-[#9E958F]">
          The page you are looking for does not exist or may have been moved.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 rounded-full bg-[#F4512C] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#E04320] transition active:scale-95"
          >
            <ArrowLeft size={15} />
            Return to Home
          </Link>
        </div>
      </section>
    </PageShell>
  );
};

export default NotFound;
