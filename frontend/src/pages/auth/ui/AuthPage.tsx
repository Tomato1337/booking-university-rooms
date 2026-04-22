import { atom } from "@reatom/core";
import { bindField, reatomComponent, useWrap } from "@reatom/react";
import { IconArrowRight, IconLoader2 } from "@tabler/icons-react";

import { authErrorAtom, loginForm, registerForm } from "@/modules/auth";

import { rootRoute } from "@/shared/router";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import Logo from "@/shared/ui/logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { dashboardRoute } from "@/pages/dashboard";

type AuthTab = "login" | "register";

const authTabAtom = atom<AuthTab>("login", "authTabAtom");

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

const errorClassName = "mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary";

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
        <a href={dashboardRoute.path()} className="flex items-center gap-2 cursor-pointer">
          <Logo />
        </a>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <h1 className="mb-8 text-[7rem] font-black leading-[0.85] tracking-tighter text-on-surface">
          MTUCI
          <br />
          <span className="text-primary">SPACE</span>
        </h1>
        <p className="max-w-md text-lg font-medium leading-relaxed text-on-surface-variant">
          The next-generation space management protocol for the modern academic ecosystem. Precision
          booking, real-time telemetry.
        </p>
      </div>
    </section>
  );
}

const RegisterForm = reatomComponent(() => {
  //   const { fields, submit } = registerForm;
  const ready = registerForm.submit.ready();
  const serverError = authErrorAtom();

  const { error: firstNameError, ...firstNameBind } = bindField(registerForm.fields.firstName);
  const { error: lastNameError, ...lastNameBind } = bindField(registerForm.fields.lastName);
  const { error: emailError, ...emailBind } = bindField(registerForm.fields.email);
  const { error: passwordError, ...passwordBind } = bindField(registerForm.fields.password);
  const { error: confirmPasswordError, ...confirmPasswordBind } = bindField(
    registerForm.fields.confirmPassword,
  );
  const departmentError = registerForm.fields.department.validation().error;
  console.log(registerForm.fields.department());
  return (
    <>
      <header className="mb-10">
        <h2 className="mb-2 text-4xl font-black uppercase tracking-tight text-on-surface">
          Initialize Profile
        </h2>
        <p className="text-sm text-on-surface-variant">Access the campus resource grid.</p>
      </header>

      <form
        className="space-y-6"
        onSubmit={useWrap((e) => {
          e.preventDefault();
          registerForm.submit();
        })}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClassName}>First Name</label>
            <Input
              {...firstNameBind}
              aria-invalid={!!firstNameError}
              className={inputClassName}
              placeholder="ALEXANDER"
              type="text"
            />
            {firstNameError && <p className={errorClassName}>{firstNameError}</p>}
          </div>
          <div className="space-y-1.5">
            <label className={labelClassName}>Last Name</label>
            <Input
              {...lastNameBind}
              aria-invalid={!!lastNameError}
              className={inputClassName}
              placeholder="VANCE"
              type="text"
            />
            {lastNameError && <p className={errorClassName}>{lastNameError}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClassName}>Email</label>
          <Input
            {...emailBind}
            aria-invalid={!!emailError}
            className={inputClassName}
            placeholder="S1234567@UNIVERSITY.EDU"
            type="email"
          />
          {emailError && <p className={errorClassName}>{emailError}</p>}
        </div>

        <div className="space-y-1.5">
          <label className={labelClassName}>Department</label>
          <Select
            value={registerForm.fields.department() || undefined}
            onValueChange={useWrap((val: string) => registerForm.fields.department.set(val))}
          >
            <SelectTrigger
              aria-invalid={!!departmentError}
              className={cn(inputClassName, "placeholder:text-on-surface-variant/50")}
            >
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
          {departmentError && <p className={errorClassName}>{departmentError}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClassName}>Create Password</label>
            <Input
              {...passwordBind}
              aria-invalid={!!passwordError}
              className={inputClassName}
              placeholder="••••••••"
              type="password"
            />
            {passwordError && <p className={errorClassName}>{passwordError}</p>}
          </div>
          <div className="space-y-1.5">
            <label className={labelClassName}>Confirm Password</label>
            <Input
              {...confirmPasswordBind}
              aria-invalid={!!confirmPasswordError}
              className={inputClassName}
              placeholder="••••••••"
              type="password"
            />
            {confirmPasswordError && <p className={errorClassName}>{confirmPasswordError}</p>}
          </div>
        </div>

        {serverError && (
          <p data-slot="auth-error" className={errorClassName}>
            {serverError}
          </p>
        )}

        <div className="pt-6">
          <Button
            className="w-full py-5 text-sm font-black uppercase tracking-[0.2em]"
            disabled={!ready}
            type="submit"
          >
            {ready ? (
              <>
                Create Account
                <IconArrowRight className="size-4 transition-transform duration-150 ease-linear group-hover/button:translate-x-1" />
              </>
            ) : (
              <>
                Creating...
                <IconLoader2 className="size-4 animate-spin" />
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  );
}, "RegisterForm");

const LoginForm = reatomComponent(() => {
  const { fields, submit } = loginForm;
  const ready = submit.ready();
  const serverError = authErrorAtom();
  const { error: emailError, ...emailBind } = bindField(fields.email);
  const { error: passwordError, ...passwordBind } = bindField(fields.password);

  return (
    <>
      <header className="mb-10">
        <h2 className="mb-2 text-4xl font-black uppercase tracking-tight text-on-surface">
          Access Terminal
        </h2>
        <p className="text-sm text-on-surface-variant">Authenticate to the campus resource grid.</p>
      </header>

      <form
        className="space-y-6"
        onSubmit={useWrap((e) => {
          e.preventDefault();
          submit();
        })}
      >
        <div className="space-y-1.5">
          <label className={labelClassName}>Email</label>
          <Input
            {...emailBind}
            aria-invalid={!!emailError}
            className={inputClassName}
            placeholder="S1234567@UNIVERSITY.EDU"
            type="email"
          />
          {emailError && <p className={errorClassName}>{emailError}</p>}
        </div>

        <div className="space-y-1.5">
          <label className={labelClassName}>Password</label>
          <Input
            {...passwordBind}
            aria-invalid={!!passwordError}
            className={inputClassName}
            placeholder="••••••••"
            type="password"
          />
          {passwordError && <p className={errorClassName}>{passwordError}</p>}
        </div>

        {serverError && (
          <p data-slot="auth-error" className={errorClassName}>
            {serverError}
          </p>
        )}

        <div className="pt-6">
          <Button
            className="w-full py-5 text-sm font-black uppercase tracking-[0.2em]"
            disabled={!ready}
            type="submit"
          >
            {ready ? (
              <>
                Access Terminal
                <IconArrowRight className="size-4 transition-transform duration-150 ease-linear group-hover/button:translate-x-1" />
              </>
            ) : (
              <>
                Authenticating...
                <IconLoader2 className="size-4 animate-spin" />
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  );
}, "LoginForm");

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
              onClick={useWrap(() => {
                authTabAtom.set("login");
                authErrorAtom.set(null);
              })}
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
              onClick={useWrap(() => {
                authTabAtom.set("register");
                authErrorAtom.set(null);
              })}
              type="button"
            >
              Register
            </button>
          </div>

          {activeTab === "login" ? <LoginForm /> : <RegisterForm />}
        </div>

        <div className="absolute bottom-10 left-10 lg:hidden">
          <a href={dashboardRoute.path()} className="flex items-center gap-2 cursor-pointer">
            <Logo />
          </a>
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
