import { asc, between, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ATTENDANCE_STATUS } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Empty, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getAllowedMenus, requireUser } from "@/lib/session";
import { resolvePeriod } from "@/lib/reports";
import { diffDays, fmtDate, fmtTime, todayStr } from "@/lib/utils";
import { checkInAction, checkOutAction, setAttendanceStatusAction } from "./actions";

const { attendances: a, employees: e } = schema;

export default async function AbsensiPage({ searchParams }: { searchParams: Promise<{ dari?: string; sampai?: string }> }) {
  const user = await requireUser("absensi");
  const sp = await searchParams;
  const canAll = (await getAllowedMenus(user.role)).includes("karyawan");
  const today = todayStr();
  const { from, to } = sp.dari && sp.sampai ? resolvePeriod("kustom", today, sp.dari, sp.sampai) : resolvePeriod("bulan", today);

  const emps = await db.select().from(e).where(canAll ? eq(e.status, "aktif") : eq(e.userId, user.id)).orderBy(asc(e.name));
  const ids = new Set(emps.map((x) => x.id));
  const todays = (await db.select().from(a).where(eq(a.date, today))).filter((r) => ids.has(r.employeeId));
  const byEmp = new Map(todays.map((r) => [r.employeeId, r]));
  const range = (await db.select().from(a).where(between(a.date, from, to))).filter((r) => ids.has(r.employeeId));
  const rekap = emps.map((emp) => {
    const rows = range.filter((r) => r.employeeId === emp.id);
    const count = Object.fromEntries(ATTENDANCE_STATUS.map((s) => [s, rows.filter((r) => r.status === s).length])) as Record<(typeof ATTENDANCE_STATUS)[number], number>;
    const minutes = rows.reduce((t, r) => t + (r.checkIn && r.checkOut ? (r.checkOut.getTime() - r.checkIn.getTime()) / 60000 : 0), 0);
    return { emp, count, hours: Math.round(minutes / 6) / 10 };
  });
  const totalDays = diffDays(from, (to < today ? to : today)) + 1;

  return (
    <>
      <PageHeader title="Absensi" description={`Hari ini, ${fmtDate(today)}`} />
      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle>Kehadiran hari ini</CardTitle></CardHeader>
          <CardContent>
            {emps.length === 0 ? <Empty>{canAll ? "Belum ada karyawan aktif." : "Akun Anda belum terhubung dengan data karyawan."}</Empty> : (
              <ul className="divide-y">
                {emps.map((emp) => {
                  const r = byEmp.get(emp.id);
                  return (
                    <li key={emp.id} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">{emp.name} <span className="text-sm font-normal text-muted-foreground">{emp.position}</span></p>
                        <p className="text-sm text-muted-foreground">
                          {r ? <><StatusBadge status={r.status} /> {r.checkIn && `Masuk ${fmtTime(r.checkIn)}`}{r.checkOut && ` · Keluar ${fmtTime(r.checkOut)}`}{r.note && ` · ${r.note}`}</> : "Belum absen"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-start gap-2">
                        {!r?.checkIn && <ActionForm action={checkInAction}><input type="hidden" name="employeeId" value={emp.id} /><SubmitButton size="sm">Check-in</SubmitButton></ActionForm>}
                        {r?.checkIn && !r.checkOut && <ActionForm action={checkOutAction}><input type="hidden" name="employeeId" value={emp.id} /><SubmitButton size="sm" variant="secondary">Check-out</SubmitButton></ActionForm>}
                        <ActionForm action={setAttendanceStatusAction} className="flex flex-wrap gap-2">
                          <input type="hidden" name="employeeId" value={emp.id} />
                          <Select name="status" defaultValue={r?.status ?? "izin"} className="h-8 w-28 py-0 text-sm">{ATTENDANCE_STATUS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</Select>
                          <Input name="note" placeholder="Keterangan" defaultValue={r?.note ?? ""} className="h-8 w-36 text-sm" />
                          <SubmitButton size="sm" variant="outline">Simpan</SubmitButton>
                        </ActionForm>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rekap absensi</CardTitle>
            <CardDescription>{fmtDate(from)} – {fmtDate(to)} ({totalDays > 0 ? totalDays : 0} hari berjalan)</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="mb-4 flex flex-wrap gap-2">
              <Input type="date" name="dari" defaultValue={from} className="w-40" aria-label="Dari" />
              <Input type="date" name="sampai" defaultValue={to} className="w-40" aria-label="Sampai" />
              <Button type="submit" variant="secondary">Tampilkan</Button>
            </form>
            <Table>
              <THead><TR><TH>Karyawan</TH>{ATTENDANCE_STATUS.map((s) => <TH key={s} className="text-right capitalize">{s}</TH>)}<TH className="text-right">Jam kerja</TH></TR></THead>
              <TBody>
                {rekap.map((r) => <TR key={r.emp.id}><TD className="font-medium">{r.emp.name}</TD>{ATTENDANCE_STATUS.map((s) => <TD key={s} className="text-right">{r.count[s]}</TD>)}<TD className="text-right">{r.hours} jam</TD></TR>)}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
