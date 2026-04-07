import { atom } from "@reatom/core";
import { reatomComponent, useWrap } from "@reatom/react";
import { IconArrowRight } from "@tabler/icons-react";

import { rootRoute } from "@/shared/router";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import Logo from "@/shared/ui/logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

type AuthTab = "login" | "register";

const authTabAtom = atom<AuthTab>("register", "authTabAtom");

const DEPARTMENTS = [
  "SCHOOL OF ARCHITECTURE",
  "FACULTY OF COMPUTING",
  "ENGINEERING RESEARCH",
  "DIGITAL ARTS LAB",
] as const;

const inputClassName =
  "h-auto border-none p-4 text-sm font-bold uppercase tracking-wide placeholder:text-outline-variant focus-visible:border-none focus-visible:ring-0";

const labelClassName =
  "block text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant";

function AuthBranding() {
  return (
    <section
      data-slot="auth-branding"
      className="relative hidden w-1/2 flex-col overflow-hidden bg-surface p-16 lg:flex"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 0% 0%, oklch(0.68 0.25 280 / 8%) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10">
        <Logo />
        <div className="mt-2 flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            System Status: Operational
          </span>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <h1 className="mb-8 text-[7rem] font-black leading-[0.85] tracking-tighter text-on-surface">
          UNI
          <br />
          BOOK
        </h1>
        <p className="max-w-md text-lg font-medium leading-relaxed text-on-surface-variant">
          The next-generation space management protocol for the modern academic ecosystem. Precision
          booking, real-time telemetry.
        </p>
      </div>
    </section>
  );
}

function RegisterForm() {
  return (
    <>
      <header className="mb-10">
        <h2 className="mb-2 text-4xl font-black uppercase tracking-tight text-on-surface">
          Initialize Profile
        </h2>
        <p className="text-sm text-on-surface-variant">Access the campus resource grid.</p>
      </header>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-1.5">
          <label className={labelClassName}>Full Name</label>
          <Input className={inputClassName} placeholder="ALEXANDER VANCE" type="text" />
        </div>

        <div className="space-y-1.5">
          <label className={labelClassName}>Email</label>
          <Input className={inputClassName} placeholder="S1234567@UNIVERSITY.EDU" type="email" />
        </div>

        <div className="space-y-1.5">
          <label className={labelClassName}>Department</label>
          <Select>
            <SelectTrigger className={cn(inputClassName, "placeholder:text-on-surface-variant/50")}>
              <SelectValue placeholder="SELECT DEPARTMENT" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClassName}>Create Password</label>
            <Input className={inputClassName} placeholder="••••••••" type="password" />
          </div>
          <div className="space-y-1.5">
            <label className={labelClassName}>Confirm Password</label>
            <Input className={inputClassName} placeholder="••••••••" type="password" />
          </div>
        </div>

        <div className="pt-6">
          <Button
            className="w-full py-5 text-sm font-black uppercase tracking-[0.2em]"
            type="submit"
          >
            Create Account
            <IconArrowRight className="size-4 transition-transform duration-150 ease-linear group-hover/button:translate-x-1" />
          </Button>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50">
          By initializing, you agree to the{" "}
          <span className="cursor-pointer text-on-surface transition-colors duration-150 ease-linear hover:text-primary">
            Resource Usage Protocol
          </span>
          .
        </p>
      </form>
    </>
  );
}

function LoginForm() {
  return (
    <>
      <header className="mb-10">
        <h2 className="mb-2 text-4xl font-black uppercase tracking-tight text-on-surface">
          Access Terminal
        </h2>
        <p className="text-sm text-on-surface-variant">Authenticate to the campus resource grid.</p>
      </header>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-1.5">
          <label className={labelClassName}>Email</label>
          <Input className={inputClassName} placeholder="S1234567@UNIVERSITY.EDU" type="email" />
        </div>

        <div className="space-y-1.5">
          <label className={labelClassName}>Password</label>
          <Input className={inputClassName} placeholder="••••••••" type="password" />
        </div>

        <div className="pt-6">
          <Button
            className="w-full py-5 text-sm font-black uppercase tracking-[0.2em]"
            type="submit"
          >
            Access Terminal
            <IconArrowRight className="size-4 transition-transform duration-150 ease-linear group-hover/button:translate-x-1" />
          </Button>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50">
          By accessing, you agree to the{" "}
          <span className="cursor-pointer text-on-surface transition-colors duration-150 ease-linear hover:text-primary">
            Resource Usage Protocol
          </span>
          .
        </p>
      </form>
    </>
  );
}

const AuthPage = reatomComponent(() => {
  const activeTab = authTabAtom();

  return (
    <main data-slot="auth-page" className="flex min-h-screen w-full">
      <AuthBranding />

      <section className="relative flex w-full flex-col items-center justify-center overflow-y-auto bg-surface-container-low p-8 lg:w-1/2 lg:p-24">
        <div className="w-full max-w-md">
          <div className="mb-12 flex gap-8">
            <button
              className={cn(
                "pb-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-150 ease-linear",
                activeTab === "login"
                  ? "border-b-2 border-primary text-primary"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
              onClick={useWrap(() => authTabAtom.set("login"))}
              type="button"
            >
              Login
            </button>
            <button
              className={cn(
                "pb-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-150 ease-linear",
                activeTab === "register"
                  ? "border-b-2 border-primary text-primary"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
              onClick={useWrap(() => authTabAtom.set("register"))}
              type="button"
            >
              Register
            </button>
          </div>

          {activeTab === "login" ? <LoginForm /> : <RegisterForm />}
        </div>

        <div className="absolute bottom-10 left-10 lg:hidden">
          <Logo />
        </div>
      </section>
    </main>
  );
}, "AuthPage");

export const authRoute = rootRoute.reatomRoute(
  {
    path: "auth",
    render: () => <AuthPage />,
  },
  "auth",
);
