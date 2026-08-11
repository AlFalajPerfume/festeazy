/* eslint-disable */
import AdminShell from "@/components/admin/AdminShell";
import { ArrowRight, Sparkles } from "lucide-react";

type ComingSoonPageProps = {
  title: string;
  subtitle: string;
  nextStep: string;
};

export default function ComingSoonPage({
  title,
  subtitle,
  nextStep,
}: ComingSoonPageProps) {
  return (
    <AdminShell title={title} subtitle={subtitle}>
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-xl shadow-slate-900/5">
          <div className="relative bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-900 p-8 text-white sm:p-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-violet-100 backdrop-blur">
                <Sparkles size={16} />
                Coming in next phase
              </div>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.06em]">
                {title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/75 sm:text-base">
                {nextStep}
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
            {[
              "Design user-friendly form",
              "Connect Supabase table",
              "Add filters, edit and delete",
            ].map((item, index) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
                  Step {index + 1}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm font-black text-slate-800">
                  {item}
                  <ArrowRight size={16} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
