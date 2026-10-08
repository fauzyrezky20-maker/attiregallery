import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getAllowedMenus, requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { MENUS } from "@/lib/permissions";
import { saveGuideAction, saveSavingsAction, savePaymentAction, savePermissionsAction, saveProfileAction, saveRulesAction, saveNotifAction, saveTermsAction } from "./actions";

const Check = ({ name, label, checked }: { name: string; label: string; checked: boolean }) => (
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={checked} className="size-4" /> {label}</label>
);

export default async function PengaturanPage() {
  const user = await requireUser("pengaturan");
  const s = await getSettings();
  const [kasir, staf] = await Promise.all([getAllowedMenus("kasir"), getAllowedMenus("staf")]);

  return (
    <>
      <PageHeader title="Pengaturan Toko" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Katalog untuk pelanggan</CardTitle>
            <CardDescription>
              Halaman tanpa login berisi foto, harga, dan ketersediaan kebaya. Pelanggan bisa cek tanggal lalu pesan lewat WhatsApp
              {s.phone ? ` ke ${s.phone}` : " (isi dulu No. telepon / WhatsApp di Profil toko)"}. Data pesanan, pelanggan, dan keuangan tidak ikut terlihat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/katalog" target="_blank" className="font-medium text-primary hover:underline">Buka katalog</Link>
            <span className="text-sm text-muted-foreground"> · bagikan alamat halaman ini ke pelanggan (misalnya di bio Instagram atau WhatsApp).</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Profil toko</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={saveProfileAction}>
              <div className="flex items-center gap-4">
                {s.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logoUrl} alt="Logo" className="h-16 w-16 rounded-full border object-cover" />
                ) : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">Logo</div>}
                <Field label="Ganti logo" className="flex-1"><Input type="file" name="logo" accept="image/*" /></Field>
              </div>
              <Field label="Nama toko"><Input name="storeName" defaultValue={s.storeName} required /></Field>
              <Field label="Alamat"><Textarea name="address" rows={2} defaultValue={s.address ?? ""} /></Field>
              <Field label="No. telepon / WhatsApp"><Input name="phone" defaultValue={s.phone ?? ""} /></Field>
              <Field label="Instagram" hint="Tanpa @, mis. attiregalleryyy"><Input name="instagram" defaultValue={s.instagram ?? ""} /></Field>
              <SubmitButton>Simpan profil</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Aturan sewa & denda</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={saveRulesAction}>
              <Field label="Harga sewa berlaku untuk (hari)" hint="Harga produk adalah harga per paket ini. Sewa lebih lama dihitung kelipatannya."><Input name="defaultRentDays" type="number" min={1} defaultValue={s.defaultRentDays} /></Field>
              <p className="rounded-md bg-muted p-3 text-sm">Denda keterlambatan: <b>per hari sesuai harga sewa baju</b> yang dipinjam (dihitung otomatis saat pengembalian).</p>
              <Field label="DP minimal untuk fix booking (Rp)"><Input name="dpAmount" type="number" min={0} step={1000} defaultValue={s.dpAmount} /></Field>
              <Field label="Pelunasan paling lambat H-berapa"><Input name="settleDaysBefore" type="number" min={0} max={30} defaultValue={s.settleDaysBefore} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jam ambil mulai"><Input name="pickupFrom" type="time" defaultValue={s.pickupFrom} /></Field>
                <Field label="Jam ambil sampai"><Input name="pickupUntil" type="time" defaultValue={s.pickupUntil} /></Field>
              </div>
              <Field label="Batas stok menipis (unit)" hint="Kebaya dengan unit tersedia ≤ angka ini tampil di dasbor"><Input name="lowStockThreshold" type="number" min={0} defaultValue={s.lowStockThreshold} /></Field>
              <SubmitButton>Simpan aturan</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Metode pembayaran</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={savePaymentAction}>
              <Check name="cashEnabled" label="Tunai" checked={s.cashEnabled} />
              <Check name="qrisEnabled" label="QRIS" checked={s.qrisEnabled} />
              <Field label="Kode QRIS toko" hint="Pindai QRIS statis toko dengan aplikasi pemindai QR, lalu tempel teksnya di sini. Aplikasi otomatis membuat QRIS dengan nominal tagihan.">
                <Textarea name="qrisPayload" rows={3} defaultValue={s.qrisPayload ?? ""} className="font-mono text-xs" placeholder="00020101021126…6304ABCD" />
              </Field>
              <Check name="transferEnabled" label="Transfer bank" checked={s.transferEnabled} />
              <Field label="Info rekening transfer"><Textarea name="transferInfo" rows={3} defaultValue={s.transferInfo ?? ""} placeholder={"BCA 1234567890\na.n. AttireGallery"} /></Field>
              <SubmitButton>Simpan metode</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabungan toko</CardTitle>
            <CardDescription>Dipakai di menu Tabungan Toko untuk setor bulanan lewat m-banking.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveSavingsAction}>
              <Field label="Rekening tabungan"><Textarea name="savingsAccount" rows={2} defaultValue={s.savingsAccount ?? ""} placeholder={"BRI 1234 5678 9012\na.n. AttireGallery"} /></Field>
              <Field label="Link aplikasi m-banking" hint="Opsional. Mis. https://bri.co.id/brimo atau link toko aplikasi bank Anda."><Input name="mbankingUrl" type="url" defaultValue={s.mbankingUrl ?? ""} placeholder="https://" /></Field>
              <SubmitButton>Simpan tabungan</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifikasi</CardTitle>
            <CardDescription>Pengingat tampil di Dasbor saat aplikasi dibuka.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveNotifAction}>
              <Check name="notifyPickup" label="Ingatkan kebaya yang akan diambil" checked={s.notifyPickup} />
              <Check name="notifyReturn" label="Ingatkan kebaya yang harus kembali & yang terlambat" checked={s.notifyReturn} />
              <Check name="notifyPayment" label="Ingatkan tagihan yang belum lunas" checked={s.notifyPayment} />
              <Field label="Ingatkan berapa hari sebelumnya"><Input name="reminderDaysBefore" type="number" min={0} max={14} defaultValue={s.reminderDaysBefore} /></Field>
              <SubmitButton>Simpan notifikasi</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tata cara sewa</CardTitle>
            <CardDescription>Ditampilkan di Kasir dan di katalog pelanggan.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveGuideAction}>
              <Field label="Teks tata cara"><Textarea name="rentalGuide" rows={8} defaultValue={s.rentalGuide ?? ""} /></Field>
              <SubmitButton>Simpan tata cara</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Syarat & Ketentuan sewa</CardTitle>
            <CardDescription>Ditampilkan di Kasir; pelanggan wajib menyetujui sebelum transaksi disimpan. Persetujuan dicatat beserta versinya.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveTermsAction}>
              <Field label="Teks S&K"><Textarea name="termsText" rows={8} defaultValue={s.termsText ?? ""} /></Field>
              <Field label="Versi" hint="Naik otomatis bila teks diubah" className="max-w-40"><Input name="termsVersion" defaultValue={s.termsVersion} /></Field>
              <SubmitButton>Simpan S&K</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        {user.role === "pemilik" && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Peran & hak akses</CardTitle>
              <CardDescription>Pilih menu yang boleh dibuka tiap peran. Pemilik selalu bisa membuka semua menu.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActionForm action={savePermissionsAction}>
                <Table>
                  <THead><TR><TH>Menu</TH><TH className="text-center">Pemilik</TH><TH className="text-center">Kasir</TH><TH className="text-center">Staf</TH></TR></THead>
                  <TBody>
                    {MENUS.map((m) => (
                      <TR key={m.key}>
                        <TD>{m.label}</TD>
                        <TD className="text-center"><input type="checkbox" checked disabled className="size-4" aria-label={`Pemilik ${m.label}`} /></TD>
                        <TD className="text-center"><input type="checkbox" name={`kasir:${m.key}`} defaultChecked={kasir.includes(m.key)} disabled={m.key === "dasbor"} className="size-4" aria-label={`Kasir ${m.label}`} /></TD>
                        <TD className="text-center"><input type="checkbox" name={`staf:${m.key}`} defaultChecked={staf.includes(m.key)} disabled={m.key === "dasbor"} className="size-4" aria-label={`Staf ${m.label}`} /></TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <SubmitButton className="justify-self-start">Simpan hak akses</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
