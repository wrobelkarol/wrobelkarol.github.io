/* DocumentFlow — wersja demo w przeglądarce.
 *
 * Reguły obiegu są przeniesione 1:1 z programu w Pythonie (documentflow/obieg.py, akceptacja.py,
 * walidacja.py, retencja.py, terminy.py). Odczyt dokumentów (OCR, rozpoznanie typu i pól) wykonał
 * wcześniej pełny program — wyniki są w dane/stan.json. Stan demo zapisuje się w przeglądarce.
 */
'use strict';

// ------------------------------------------------------------------ słowniki

const UZYTKOWNICY = [
  { login: 'operator', imie: 'Operator (Ty)', rola: 'operator' },
  { login: 'a.kowalska', imie: 'Anna Kowalska', rola: 'kierownik', dzial: 'Logistyka' },
  { login: 'p.wisniewski', imie: 'Piotr Wiśniewski', rola: 'kierownik', dzial: 'IT' },
  { login: 'm.zielinska', imie: 'Magdalena Zielińska', rola: 'kierownik', dzial: 'Administracja' },
  { login: 't.lewandowski', imie: 'Tomasz Lewandowski', rola: 'kierownik', dzial: 'Marketing' },
  { login: 'e.wojcik', imie: 'Ewa Wójcik', rola: 'kierownik', dzial: 'Finanse' },
  { login: 'j.nowak', imie: 'Jan Nowak', rola: 'dyrektor' },
  { login: 'b.mazur', imie: 'Barbara Mazur', rola: 'finanse' },
];
const PO_LOGINIE = Object.fromEntries(UZYTKOWNICY.map(u => [u.login, u]));
const SYSTEM = 'system';

function opisUzytkownika(u) {
  if (u.rola === 'operator') return `${u.imie} — operator`;
  if (u.rola === 'kierownik') return `${u.imie} — kierownik (${u.dzial})`;
  if (u.rola === 'finanse') return `${u.imie} — finanse`;
  return `${u.imie} — ${u.rola}`;
}
function nazwa(login) {
  if (!login) return '';
  if (login === SYSTEM) return 'system';
  return PO_LOGINIE[login] ? PO_LOGINIE[login].imie : login;
}
const kierownikDzialu = dzial => UZYTKOWNICY.find(u => u.rola === 'kierownik' && u.dzial === dzial);
const dyrektor = () => UZYTKOWNICY.find(u => u.rola === 'dyrektor');
const finanse = () => UZYTKOWNICY.find(u => u.rola === 'finanse');

const DZIALY = ['Logistyka', 'IT', 'Administracja', 'Marketing', 'Finanse'];
const TYPY = ['faktura', 'umowa', 'pismo', 'inne'];
const NAZWY_TYPOW = { faktura: 'Faktura', umowa: 'Umowa', pismo: 'Pismo', inne: 'Inne' };
const PREFIKSY = { faktura: 'FV', umowa: 'UM', pismo: 'PI', inne: 'IN' };
const KATALOGI_TYPOW = { faktura: 'Faktury', umowa: 'Umowy', pismo: 'Pisma', inne: 'Inne' };
const RETENCJA = { faktura: ['B5', 5], umowa: ['B10', 10], pismo: ['B5', 5], inne: ['B5', 5] };
const NASZA_FIRMA = 'Novarel Dystrybucja Sp. z o.o.';
const DNI_ALERTU = 3;

const OPISY_STATUSOW = {
  NOWY: 'Nowy', DO_WERYFIKACJI: 'Do weryfikacji', WYMAGA_WYJASNIENIA: 'Wymaga wyjaśnienia',
  OCZEKUJE_NA_AKCEPTACJE: 'Oczekuje na akceptację', ZATWIERDZONY: 'Zatwierdzony', PRZEKAZANY: 'Przekazany',
  ZARCHIWIZOWANY: 'Zarchiwizowany', ODRZUCONY: 'Odrzucony', DUPLIKAT: 'Duplikat',
};
const KOLORY_STATUSOW = {
  NOWY: 'szary', DO_WERYFIKACJI: 'pomaranczowy', WYMAGA_WYJASNIENIA: 'czerwony', OCZEKUJE_NA_AKCEPTACJE: 'niebieski',
  ZATWIERDZONY: 'zielony', PRZEKAZANY: 'zielony', ZARCHIWIZOWANY: 'zielony', ODRZUCONY: 'czerwony', DUPLIKAT: 'fioletowy',
};
const PRZEJSCIA = {
  null: ['NOWY'],
  NOWY: ['DUPLIKAT', 'DO_WERYFIKACJI'],
  DO_WERYFIKACJI: ['DUPLIKAT', 'WYMAGA_WYJASNIENIA', 'OCZEKUJE_NA_AKCEPTACJE', 'ZATWIERDZONY'],
  WYMAGA_WYJASNIENIA: ['DO_WERYFIKACJI', 'DUPLIKAT'],
  OCZEKUJE_NA_AKCEPTACJE: ['ZATWIERDZONY', 'ODRZUCONY', 'WYMAGA_WYJASNIENIA'],
  ZATWIERDZONY: ['PRZEKAZANY', 'ZARCHIWIZOWANY'],
  PRZEKAZANY: ['ZARCHIWIZOWANY'],
  ZARCHIWIZOWANY: [], ODRZUCONY: [], DUPLIKAT: [],
};
const NIEZATWIERDZONE = ['NOWY', 'DO_WERYFIKACJI', 'WYMAGA_WYJASNIENIA', 'OCZEKUJE_NA_AKCEPTACJE'];

const OPISY_ZDARZEN = {
  DOKUMENT_PRZYJETY: 'Dokument przyjęty', DUPLIKAT_PLIKU: 'Duplikat pliku (SHA-256)', OCR_WYKONANY: 'OCR wykonany',
  TYP_ROZPOZNANY: 'Typ rozpoznany', TYP_ZMIENIONY: 'Typ zmieniony', POLE_ZMIENIONE: 'Pole poprawione',
  DANE_ZATWIERDZONE: 'Dane zatwierdzone', DUPLIKAT_LOGICZNY_WYKRYTY: 'Oznaczony jako duplikat',
  NUMER_NADANY: 'Numer rejestrowy nadany', WYSLANO_DO_AKCEPTACJI: 'Wysłano do akceptacji', ZATWIERDZONO: 'Zatwierdzono',
  ODRZUCONO: 'Odrzucono', ZWROCONO: 'Zwrócono do wyjaśnienia', PRZEKAZANO: 'Przekazano', ZARCHIWIZOWANO: 'Zarchiwizowano',
  ZMIANA_STATUSU: 'Zmiana statusu', WYMAGA_WYJASNIENIA: 'Wymaga wyjaśnienia', WYJASNIONO: 'Wyjaśniono',
  BLAD_PRZETWARZANIA: 'Błąd przetwarzania', NOWA_WERSJA: 'Nowa wersja pliku', OZNACZONO_JAKO_BLEDNY: 'Oznaczony jako błędny', RETENCJA_USTALONA: 'Ustalono termin brakowania',
  USTAWIENIA_ZMIENIONE: 'Zmiana ustawień',
};

const POLA_TYPU = {
  faktura: [
    ['dostawca', 'Dostawca', 'tekst'], ['nip', 'NIP dostawcy', 'nip'], ['numer_faktury', 'Numer faktury', 'tekst'],
    ['data_wystawienia', 'Data wystawienia', 'data'], ['termin_platnosci', 'Termin płatności', 'data'],
    ['netto', 'Netto (zł)', 'kwota'], ['vat', 'VAT (zł)', 'kwota'], ['brutto', 'Brutto (zł)', 'kwota'],
    ['typ_kosztu', 'Typ kosztu', 'tekst'],
  ],
  umowa: [
    ['tytul', 'Tytuł umowy', 'tekst'], ['numer', 'Numer umowy', 'tekst'], ['kontrahent', 'Druga strona umowy', 'tekst'],
    ['data_zawarcia', 'Data zawarcia', 'data'], ['przedmiot', 'Przedmiot umowy', 'tekst_dlugi'],
    ['okres_obowiazywania', 'Okres obowiązywania', 'tekst'], ['wartosc', 'Wartość netto (zł)', 'kwota'],
  ],
  pismo: [
    ['nadawca', 'Nadawca', 'tekst'], ['data_pisma', 'Data pisma', 'data'], ['dotyczy', 'Dotyczy', 'tekst'],
    ['termin_odpowiedzi', 'Termin odpowiedzi', 'data'],
  ],
  inne: [['tytul', 'Tytuł / rodzaj dokumentu', 'tekst'], ['data', 'Data dokumentu', 'data']],
};
const POLA_OBOWIAZKOWE = {
  faktura: { dostawca: 'dostawca', nip: 'NIP', numer_faktury: 'numer faktury', data_wystawienia: 'data wystawienia',
    termin_platnosci: 'termin płatności', brutto: 'kwota brutto' },
  umowa: { kontrahent: 'druga strona umowy', data_zawarcia: 'data zawarcia' },
  pismo: { nadawca: 'nadawca', data_pisma: 'data pisma' },
  inne: { tytul: 'tytuł' },
};
const NAZWY_POZIOMOW = { kierownik: 'Kierownik działu', dyrektor: 'Dyrektor', finanse: 'Finanse' };

// ------------------------------------------------------------------ narzędzia

const esc = s => String(s ?? '').replace(/[&<>"']/g, z => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));
const OGONKI = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z', Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z' };
const bezOgonkow = t => t.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, z => OGONKI[z]);
const normalizuj = t => (t ? bezOgonkow(String(t)).toLowerCase().replace(/\s+/g, ' ').trim() : '');
const sameCyfry = t => String(t || '').replace(/\D/g, '');

function slug(t, maks = 40) {
  if (!t) return '';
  let s = bezOgonkow(String(t)).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s.slice(0, maks).replace(/-+$/, '');
}
const RE_FORMA_PRAWNA = /\s*(?:Sp\.\s?z\s?o\.\s?o\.(?:\s?Sp\.\s?k\.)?|S\.\s?A\.|s\.\s?c\.|Sp\.\s?j\.|Sp\.\s?k\.)\s*$/i;
const bezFormyPrawnej = n => (n || '').replace(RE_FORMA_PRAWNA, '').replace(/^[ ,]+|[ ,]+$/g, '');

function formatujKwote(k) {
  if (k === null || k === undefined || Number.isNaN(k)) return '';
  const znak = k < 0 ? '-' : '';
  const [calosc, grosze] = Math.abs(k).toFixed(2).split('.');
  return znak + calosc.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + grosze;
}
const zl = k => (k === null || k === undefined ? '' : formatujKwote(k) + ' zł');
function formatujDate(iso) {
  if (!iso) return '';
  const [r, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${r}`;
}
function formatujCzas(iso) {
  if (!iso) return '';
  return `${formatujDate(iso)} ${iso.slice(11, 16)}`.trim();
}
function dniMiedzy(odIso, doIso) {
  const a = Date.UTC(+odIso.slice(0, 4), +odIso.slice(5, 7) - 1, +odIso.slice(8, 10));
  const b = Date.UTC(+doIso.slice(0, 4), +doIso.slice(5, 7) - 1, +doIso.slice(8, 10));
  return Math.round((b - a) / 86400000);
}
function opisDni(dni) {
  if (dni < 0) return `po terminie (${-dni} ${dni === -1 ? 'dzień' : 'dni'})`;
  if (dni === 0) return 'termin dziś';
  if (dni === 1) return 'termin jutro';
  return `za ${dni} dni`;
}
function parsujKwote(t) {
  if (t === null || t === undefined) return null;
  const s = String(t).replace(/[\s ]/g, '').replace(',', '.');
  if (!s) return null;
  return /^-?\d+(\.\d+)?$/.test(s) ? Math.round(parseFloat(s) * 100) / 100 : NaN;
}
const bezOznaczen = t => String(t ?? '').replace(/\s?\(R\d+[a-z]?\)/g, '');
const kwotaDoPola = k => (k === null || k === undefined ? '' : Number(k).toFixed(2).replace('.', ','));

// ------------------------------------------------------------------ stan

const KLUCZ_STANU = 'documentflow-demo-stan-v2';
const KLUCZ_SAMOUCZKA = 'documentflow-demo-samouczek-v2';
let S = null;
let ja = 'operator';

function przygotujStan(s) {
  const mapa = (lista) => Object.fromEntries(lista.map(w => [w.dokument_id, w]));
  const maks = (lista) => lista.reduce((m, w) => Math.max(m, w.id), 0);
  return {
    data: s.data_systemowa,
    dokumenty: s.dokumenty,
    faktury: mapa(s.faktury), umowy: mapa(s.umowy), pisma: mapa(s.pisma),
    historia: s.historia, akceptacje: s.akceptacje, wersje: s.wersje,
    liczniki: Object.fromEntries(s.liczniki.map(l => [`${l.prefiks}-${l.rok}`, l.ostatni])),
    progi: { dyrektor: 10000, finanse: 50000 },
    id: { historia: maks(s.historia), akceptacje: maks(s.akceptacje), wersje: maks(s.wersje) },
    ostatniePrzyjecie: null,
  };
}
async function stanPoczatkowy() {
  const odp = await fetch('dane/stan.json');
  return przygotujStan(await odp.json());
}
function zapisz() {
  try { localStorage.setItem(KLUCZ_STANU, JSON.stringify({ S, ja })); } catch (e) { /* tryb prywatny */ }
}
function wczytajZapisany() {
  try {
    const t = localStorage.getItem(KLUCZ_STANU);
    if (t) { const z = JSON.parse(t); return z && z.S ? z : null; }
  } catch (e) { /* brak dostępu */ }
  return null;
}

function teraz() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${S.data} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const widoczne = () => S.dokumenty.filter(d => !d.inbox);
const wInbox = () => S.dokumenty.filter(d => d.inbox);
const dokPoNumerze = numer => S.dokumenty.find(d => d.numer_wplywu === numer);
const dokPoId = id => S.dokumenty.find(d => d.id === id);
const daneTypu = d => S.faktury[d.id] || S.umowy[d.id] || S.pisma[d.id] || null;

class BladObiegu extends Error {}
class BladWalidacji extends BladObiegu {
  constructor(problemy) { super(problemy.map(p => p.komunikat).join(' ')); this.problemy = problemy; }
}

function audyt(zdarzenie, kto, dok, szczegoly) {
  S.id.historia += 1;
  S.historia.push({ id: S.id.historia, czas: teraz(), uzytkownik: kto, dokument_id: dok ? dok.id : null,
    numer_wplywu: dok ? dok.numer_wplywu : null, zdarzenie, szczegoly: szczegoly || {} });
}
function zmienStatus(dok, nowy, kto, zdarzenie, szczegoly) {
  if (!(PRZEJSCIA[dok.status] || []).includes(nowy)) throw new BladObiegu(`Niedozwolone przejście: ${dok.status} → ${nowy}`);
  const stary = dok.status;
  dok.status = nowy;
  dok.modified_at = teraz();
  audyt(zdarzenie, kto, dok, { status: `${stary} → ${nowy}`, ...(szczegoly || {}) });
}
function nastepnyNumer(prefiks, cyfry) {
  const rok = S.data.slice(0, 4);
  const klucz = `${prefiks}-${rok}`;
  S.liczniki[klucz] = (S.liczniki[klucz] || 0) + 1;
  return `${prefiks}-${rok}-${String(S.liczniki[klucz]).padStart(cyfry, '0')}`;
}

// ------------------------------------------------------------------ walidacja (R4)

const WAGI_NIP = [6, 5, 7, 2, 3, 4, 5, 6, 7];
function nipPoprawny(nip) {
  if (!nip || nip.length !== 10 || !/^\d+$/.test(nip)) return false;
  const suma = WAGI_NIP.reduce((s, w, i) => s + w * +nip[i], 0);
  const k = suma % 11;
  return k !== 10 && k === +nip[9];
}
const puste = w => w === null || w === undefined || (typeof w === 'string' && !w.trim());

function waliduj(typ, dane, dataWplywu, proForma) {
  const problemy = [];
  for (const [pole, opis] of Object.entries(POLA_OBOWIAZKOWE[typ] || {})) {
    if (puste(dane[pole])) problemy.push({ pole, komunikat: `Brak pola obowiązkowego: ${opis}.`, blokuje: true });
  }
  for (const [pole, etykieta, rodzaj] of POLA_TYPU[typ]) {
    if (rodzaj === 'kwota' && Number.isNaN(dane[pole])) problemy.push({ pole, komunikat: `${etykieta}: wpisz kwotę, np. 1234,56.`, blokuje: true });
  }
  if (typ === 'faktura') {
    const { nip, netto, vat, brutto } = dane;
    if (!puste(nip) && !nipPoprawny(nip)) problemy.push({ pole: 'nip', komunikat: 'NIP ma niepoprawną sumę kontrolną.', blokuje: true });
    if ([netto, vat, brutto].every(k => typeof k === 'number' && !Number.isNaN(k)) && Math.abs(Math.round((netto + vat - brutto) * 100) / 100) > 0.01) {
      problemy.push({ pole: 'brutto', komunikat: `Netto + VAT (${(netto + vat).toFixed(2)}) nie równa się brutto (${brutto.toFixed(2)}).`, blokuje: true });
    }
    const wyst = dane.data_wystawienia, termin = dane.termin_platnosci;
    if (wyst && dataWplywu && wyst > dataWplywu) problemy.push({ pole: 'data_wystawienia', komunikat: 'Data wystawienia jest późniejsza niż data wpływu.', blokuje: true });
    if (wyst && termin && termin < wyst) problemy.push({ pole: 'termin_platnosci', komunikat: 'Termin płatności jest wcześniejszy niż data wystawienia.', blokuje: true });
    if (proForma) problemy.push({ pole: null, komunikat: 'W treści jest „pro forma” — to nie jest faktura VAT. Sprawdź, czy dokument powinien iść dalej.', blokuje: false });
  }
  return problemy;
}

function oczysc(typ, dane) {
  const wynik = {};
  for (const [pole, , rodzaj] of POLA_TYPU[typ]) {
    let w = dane[pole];
    if (typeof w === 'string') w = w.trim() || null;
    if (rodzaj === 'nip' && w) w = sameCyfry(w) || null;
    if (rodzaj === 'kwota') w = parsujKwote(w);
    wynik[pole] = w ?? null;
  }
  return wynik;
}

// ------------------------------------------------------------------ duplikaty, ścieżka akceptacji (R3b, R7, R8)

function kluczFaktury(nip, numer) {
  if (!nip || !numer) return null;
  return `${sameCyfry(nip)}|${normalizuj(numer).replace(/ /g, '').toUpperCase()}`;
}
function mozliweDuplikaty(dokId, nip, numer) {
  const klucz = kluczFaktury(nip, numer);
  if (!klucz) return [];
  return widoczne().filter(d => {
    if (d.id === dokId || d.status === 'DUPLIKAT' || (d.typ || d.typ_proponowany) !== 'faktura') return false;
    const f = S.faktury[d.id];
    const inny = f && (f.nip || f.numer_faktury) ? kluczFaktury(f.nip, f.numer_faktury)
      : kluczFaktury((d.propozycje.nip || {}).wartosc, (d.propozycje.numer_faktury || {}).wartosc);
    return inny === klucz;
  });
}

function sciezka(typ, dzial, kwota) {
  if (typ === 'umowa') return [{ poziom: 'dyrektor', login: dyrektor().login }];
  if (typ !== 'faktura') return [];
  const kier = kierownikDzialu(dzial);
  const etapy = kier ? [{ poziom: 'kierownik', login: kier.login }] : [];
  if (kwota !== null && kwota > S.progi.dyrektor) etapy.push({ poziom: 'dyrektor', login: dyrektor().login });
  if (kwota !== null && kwota > S.progi.finanse) etapy.push({ poziom: 'finanse', login: finanse().login });
  return etapy;
}
function uzasadnienie(typ, kwota) {
  if (typ === 'umowa') return 'Umowy akceptuje dyrektor.';
  if (typ !== 'faktura') return 'Ten typ dokumentu nie wymaga akceptacji.';
  if (kwota === null) return 'Brak kwoty — akceptuje kierownik działu.';
  const k = zl(kwota);
  if (kwota > S.progi.finanse) return `Kwota ${k} > ${zl(S.progi.finanse)}: kierownik działu, dyrektor i finanse.`;
  if (kwota > S.progi.dyrektor) return `Kwota ${k} > ${zl(S.progi.dyrektor)}: kierownik działu i dyrektor.`;
  return `Kwota ${k} ≤ ${zl(S.progi.dyrektor)}: akceptuje kierownik działu.`;
}
const opisEtapu = e => `${NAZWY_POZIOMOW[e.poziom] || e.poziom}: ${nazwa(e.login)}`;
const opisSciezki = etapy => etapy.map(e => (NAZWY_POZIOMOW[e.poziom] || e.poziom).toLowerCase()).join(' → ');

const etapyAkceptacji = d => d.sciezka_akceptacji || sciezka(d.typ, d.dzial, d.kwota_brutto);
const decyzjeRundy = d => S.akceptacje.filter(a => a.dokument_id === d.id && a.runda === d.runda_akceptacji);

function biezacyEtap(d) {
  if (d.status !== 'OCZEKUJE_NA_AKCEPTACJE') return null;
  const etapy = etapyAkceptacji(d);
  const zatw = decyzjeRundy(d).filter(a => a.decyzja === 'ZATWIERDZONO').length;
  if (zatw >= etapy.length) return null;
  return { numer: zatw, etap: etapy[zatw], etapy };
}
function przebiegAkceptacji(d) {
  if (!d.runda_akceptacji && d.status !== 'OCZEKUJE_NA_AKCEPTACJE') return [];
  const decyzje = decyzjeRundy(d);
  const oczekuje = d.status === 'OCZEKUJE_NA_AKCEPTACJE';
  return etapyAkceptacji(d).map((etap, i) => {
    const dec = decyzje[i];
    let stan;
    if (dec) stan = { ZATWIERDZONO: 'zatwierdzono', ODRZUCONO: 'odrzucono', ZWROCONO: 'zwrócono' }[dec.decyzja];
    else if (oczekuje) stan = i === decyzje.length ? 'teraz' : 'czeka';
    else stan = 'nie dotyczy';
    return { etap, stan, czas: dec ? dec.czas : null, komentarz: dec ? dec.komentarz : null };
  });
}
function sprawdzUprawnienia(d, login) {
  if (login === d.zweryfikowal) throw new BladObiegu('Rozdział obowiązków: osoba, która zweryfikowała dokument, nie może go zaakceptować.');
  const b = biezacyEtap(d);
  if (!b) throw new BladObiegu('Ten dokument nie wymaga akceptacji.');
  if (login !== b.etap.login) {
    if (b.etapy.slice(b.numer + 1).some(e => e.login === login)) {
      throw new BladObiegu(`Kolejność akceptacji: najpierw ${opisEtapu(b.etap)} (etap ${b.numer + 1} z ${b.etapy.length}).`);
    }
    throw new BladObiegu(`Ten dokument akceptuje teraz: ${opisEtapu(b.etap)} (etap ${b.numer + 1} z ${b.etapy.length}).`);
  }
  return b;
}
const doAkceptacjiPrzez = login => widoczne().filter(d => {
  const b = biezacyEtap(d);
  return b && b.etap.login === login && d.zweryfikowal !== login;
});

// ------------------------------------------------------------------ terminy płatności (R9)

function terminIKwota(d) {
  const f = S.faktury[d.id];
  if ((f && f.termin_platnosci) || d.typ === 'faktura') {
    return { termin: f ? f.termin_platnosci : null, kwota: d.kwota_brutto, kontrahent: d.kontrahent, potwierdzony: true };
  }
  const p = d.propozycje || {};
  const brutto = (p.brutto || {}).wartosc;
  return { termin: (p.termin_platnosci || {}).wartosc || null, kwota: brutto !== undefined && brutto !== null ? +brutto : null,
    kontrahent: (p.dostawca || {}).wartosc || null, potwierdzony: false };
}
function terminDokumentu(d) {
  return (d.typ || d.typ_proponowany) === 'faktura' ? terminIKwota(d).termin : null;
}
function alerty() {
  const wynik = [];
  for (const d of widoczne()) {
    if (!NIEZATWIERDZONE.includes(d.status) || (d.typ || d.typ_proponowany) !== 'faktura') continue;
    const t = terminIKwota(d);
    if (!t.termin) continue;
    const dni = dniMiedzy(S.data, t.termin);
    if (dni <= DNI_ALERTU) wynik.push({ d, ...t, dni });
  }
  return wynik.sort((a, b) => a.dni - b.dni || a.d.numer_wplywu.localeCompare(b.d.numer_wplywu));
}
function pilnosc(d) {
  const t = terminDokumentu(d);
  return t ? dniMiedzy(S.data, t) : 10000;
}
const wgPilnosci = lista => lista.sort((a, b) => pilnosc(a) - pilnosc(b) || a.numer_wplywu.localeCompare(b.numer_wplywu));

// ------------------------------------------------------------------ obieg: wpływ

function przyjmijDokument(d) {
  d.inbox = false;
  const czas = teraz();
  d.data_wplywu = d.created_at = d.modified_at = czas;
  for (const h of S.historia) if (h.dokument_id === d.id) h.czas = czas;
  if (d.status === 'DUPLIKAT') {
    const pierwotny = dokPoId(d.duplikat_id);
    return `Duplikat pliku — ten sam plik co ${pierwotny ? pierwotny.numer_wplywu : 'dokument w rejestrze'} (SHA-256).`;
  }
  let opis = d.typ_proponowany ? `Rozpoznano: ${d.typ_proponowany}` : 'Typ nierozpoznany — wybierze operator';
  if (d.ostrzezenia.length) opis += ' · ' + d.ostrzezenia.join(' ');
  return opis;
}

// ------------------------------------------------------------------ obieg: weryfikacja i rejestracja

function jakoTekst(w) {
  if (w === null || w === undefined) return '';
  if (typeof w === 'number') return w.toFixed(2);
  return String(w);
}
function zapiszDaneTypu(d, typ, dane) {
  delete S.faktury[d.id]; delete S.umowy[d.id]; delete S.pisma[d.id];
  if (typ === 'faktura') {
    S.faktury[d.id] = { dokument_id: d.id, dostawca: dane.dostawca, nip: dane.nip, numer_faktury: dane.numer_faktury,
      numer_faktury_norm: normalizuj(dane.numer_faktury).replace(/ /g, '').toUpperCase(), data_wystawienia: dane.data_wystawienia,
      termin_platnosci: dane.termin_platnosci, netto: dane.netto, vat: dane.vat, brutto: dane.brutto, typ_kosztu: dane.typ_kosztu };
  } else if (typ === 'umowa') {
    S.umowy[d.id] = { dokument_id: d.id, strony: `${NASZA_FIRMA}; ${dane.kontrahent}`, data_zawarcia: dane.data_zawarcia,
      przedmiot: dane.przedmiot, okres_obowiazywania: dane.okres_obowiazywania, wartosc: dane.wartosc };
  } else if (typ === 'pismo') {
    S.pisma[d.id] = { dokument_id: d.id, nadawca: dane.nadawca, data_pisma: dane.data_pisma, dotyczy: dane.dotyczy,
      termin_odpowiedzi: dane.termin_odpowiedzi };
  }
}
function polaWspolne(typ, dane) {
  if (typ === 'faktura') return [dane.dostawca, dane.data_wystawienia, dane.brutto, `Faktura ${dane.numer_faktury}`];
  if (typ === 'umowa') return [dane.kontrahent, dane.data_zawarcia, dane.wartosc, dane.tytul || 'Umowa'];
  if (typ === 'pismo') return [dane.nadawca, dane.data_pisma, null, dane.dotyczy || 'Pismo'];
  return [null, dane.data, null, dane.tytul];
}
function nazwaPliku(numerRej, typ, dane, dataDok) {
  const czesci = [numerRej, dataDok || ''];
  if (typ === 'faktura') {
    const k = dane.brutto;
    const kwota = k === null ? '' : (k < 0 ? 'MINUS-' : '') + Math.abs(k).toFixed(2).replace('.', '-');
    czesci.push(slug(bezFormyPrawnej(dane.dostawca), 30), slug(dane.numer_faktury, 30), kwota);
  } else if (typ === 'umowa') {
    czesci.push(slug(bezFormyPrawnej(dane.kontrahent), 30), slug(dane.numer, 25));
  } else if (typ === 'pismo') {
    czesci.push(slug(bezFormyPrawnej(dane.nadawca), 30), slug(dane.dotyczy, 30));
  } else {
    czesci.push(slug(dane.tytul, 40));
  }
  return czesci.filter(Boolean).join('_') + '.pdf';
}

function sprawdzDane(d, typ, surowe) {
  const dane = oczysc(typ, surowe);
  const problemy = waliduj(typ, dane, d.data_wplywu.slice(0, 10), d.pro_forma);
  if (typ === 'faktura') {
    for (const x of mozliweDuplikaty(d.id, dane.nip, dane.numer_faktury)) {
      problemy.push({ pole: 'numer_faktury', komunikat: `Możliwy duplikat: ${x.numer_wplywu} ma ten sam NIP i numer faktury.`, blokuje: false });
    }
  }
  return problemy;
}

/* Dokument „wymaga wyjaśnienia” zatwierdza się tym samym formularzem, z opisem wyjaśnienia (R13).
 * `blad` — opis błędu: walidacje nie blokują, dokument idzie do akceptującego z oznaczeniem;
 * pismo i „inne” z błędem trafiają do kierownika działu. */
function zweryfikuj(d, typ, surowe, dzial, kto, osoba, wyjasnienie, blad) {
  if (!POLA_TYPU[typ]) throw new BladObiegu('Wybierz typ dokumentu.');
  const dane = oczysc(typ, surowe);
  if (!['DO_WERYFIKACJI', 'WYMAGA_WYJASNIENIA'].includes(d.status)) throw new BladObiegu(`Dokument nie czeka na weryfikację (status: ${d.status}).`);
  blad = (blad || '').trim() || null;
  let problemy = waliduj(typ, dane, d.data_wplywu.slice(0, 10), d.pro_forma).filter(p => p.blokuje);
  const bledyWalidacji = problemy.map(p => p.komunikat);
  if (blad) problemy = [];
  if (!dzial) problemy.push({ pole: 'dzial', komunikat: 'Wskaż dział.', blokuje: true });
  if (d.status === 'WYMAGA_WYJASNIENIA' && !(wyjasnienie || '').trim()) problemy.push({ pole: 'wyjasnienie', komunikat: 'Opisz, jak sprawa została wyjaśniona.', blokuje: true });
  if (problemy.length) throw new BladWalidacji(problemy);
  if (d.status === 'WYMAGA_WYJASNIENIA') {
    zmienStatus(d, 'DO_WERYFIKACJI', kto, 'WYJASNIONO', { komentarz: wyjasnienie.trim() });
    d.komentarz = wyjasnienie.trim();
  }

  const poprzedniTyp = d.typ || d.typ_proponowany;
  if (typ !== poprzedniTyp) audyt('TYP_ZMIENIONY', kto, d, { z: poprzedniTyp || 'NIEROZPOZNANY', na: typ });
  // porównujemy z danymi zatwierdzonymi wcześniej (np. przed zwrotem), a jeśli ich nie ma — z odczytem OCR
  const poprzednie = d.typ === typ ? (daneTypu(d) || {}) : {};
  for (const [pole, wartosc] of Object.entries(dane)) {
    const stara = pole in poprzednie ? poprzednie[pole] : (d.propozycje[pole] || {}).wartosc;
    const s_ = typeof stara === 'number' ? stara : (stara ?? null);
    if (jakoTekst(s_) !== jakoTekst(wartosc)) audyt('POLE_ZMIENIONE', kto, d, { pole, z: stara ?? null, na: wartosc });
  }
  zapiszDaneTypu(d, typ, dane);
  const [kontrahent, dataDok, kwota, tytul] = polaWspolne(typ, dane);
  let numerRej = d.numer_rejestrowy;
  if (!numerRej || (d.typ && d.typ !== typ)) numerRej = nastepnyNumer(PREFIKSY[typ], 4);
  const nazwaPl = nazwaPliku(numerRej, typ, dane, dataDok);
  const czas = teraz();
  const poprzedniNumer = d.numer_rejestrowy;
  Object.assign(d, { typ, numer_rejestrowy: numerRej, nazwa_pliku: nazwaPl, kontrahent, kontrahent_norm: normalizuj(kontrahent),
    data_dokumentu: dataDok, kwota_brutto: kwota, tytul, dzial, osoba_odpowiedzialna: osoba || null, zweryfikowal: kto,
    data_weryfikacji: czas, modified_at: czas, blad: blad ? 1 : 0, opis_bledu: blad });
  audyt('DANE_ZATWIERDZONE', kto, d, { typ, dzial, ...dane });
  if (blad) audyt('OZNACZONO_JAKO_BLEDNY', kto, d, { opis: blad, walidacja: bledyWalidacji.join(' ') || null });
  if (numerRej !== poprzedniNumer) audyt('NUMER_NADANY', SYSTEM, d, { numer_rejestrowy: numerRej, nazwa_pliku: nazwaPl });

  let etapy = sciezka(typ, dzial, kwota);
  let powod = uzasadnienie(typ, kwota);
  const kier = kierownikDzialu(dzial);
  if (blad && !etapy.length && kier) {
    etapy = [{ poziom: 'kierownik', login: kier.login }];
    powod = 'Dokument oznaczony jako błędny — decyzję podejmuje kierownik działu.';
  }
  if (etapy.length) {
    d.sciezka_akceptacji = etapy;
    d.runda_akceptacji += 1;
    zmienStatus(d, 'OCZEKUJE_NA_AKCEPTACJE', kto, 'WYSLANO_DO_AKCEPTACJI',
      { do: opisEtapu(etapy[0]), etap: `1 z ${etapy.length}`, sciezka: opisSciezki(etapy), powod, blad });
    return 'OCZEKUJE_NA_AKCEPTACJE';
  }
  zmienStatus(d, 'ZATWIERDZONY', kto, 'ZMIANA_STATUSU', { powod: `typ „${typ}” nie wymaga akceptacji` });
  archiwizuj(d);
  return 'ZARCHIWIZOWANY';
}

function oznaczDuplikat(d, numerOryginalu, kto) {
  const n = (numerOryginalu || '').trim();
  const oryginal = widoczne().find(x => x.numer_wplywu === n || x.numer_rejestrowy === n);
  if (!oryginal || oryginal.id === d.id) throw new BladObiegu('Podaj numer wpływu lub numer rejestrowy innego dokumentu (oryginału).');
  zmienStatus(d, 'DUPLIKAT', kto, 'DUPLIKAT_LOGICZNY_WYKRYTY', { oryginal: oryginal.numer_wplywu });
  d.duplikat_id = oryginal.id;
  d.plik_docelowy = `duplikaty/${d.numer_wplywu}_kopia_robocza.pdf`;
}
function wymagaWyjasnienia(d, komentarz, kto) {
  if (!komentarz || !komentarz.trim()) throw new BladObiegu('Opisz, co wymaga wyjaśnienia (komentarz jest obowiązkowy).');
  zmienStatus(d, 'WYMAGA_WYJASNIENIA', kto, 'WYMAGA_WYJASNIENIA', { komentarz: komentarz.trim() });
  d.komentarz = komentarz.trim();
}

// ------------------------------------------------------------------ obieg: akceptacja i archiwum

function decyzja(d, etap, rodzaj, komentarz) {
  S.id.akceptacje += 1;
  S.akceptacje.push({ id: S.id.akceptacje, dokument_id: d.id, poziom: etap.poziom, uzytkownik: etap.login, decyzja: rodzaj,
    komentarz: komentarz || null, czas: teraz(), runda: d.runda_akceptacji });
}
function zatwierdz(d, kto, komentarz) {
  if (d.status !== 'OCZEKUJE_NA_AKCEPTACJE') throw new BladObiegu(`Dokument nie czeka na akceptację (status: ${d.status}).`);
  const { numer, etap, etapy } = sprawdzUprawnienia(d, kto);
  decyzja(d, etap, 'ZATWIERDZONO', komentarz);
  const szczegoly = { etap: `${numer + 1} z ${etapy.length} (${NAZWY_POZIOMOW[etap.poziom].toLowerCase()})` };
  if (komentarz) szczegoly.komentarz = komentarz;
  if (numer + 1 < etapy.length) {
    d.modified_at = teraz();
    audyt('ZATWIERDZONO', kto, d, szczegoly);
    audyt('WYSLANO_DO_AKCEPTACJI', SYSTEM, d, { do: opisEtapu(etapy[numer + 1]), etap: `${numer + 2} z ${etapy.length}` });
    return 'OCZEKUJE_NA_AKCEPTACJE';
  }
  const zatwierdzili = decyzjeRundy(d).filter(a => a.decyzja === 'ZATWIERDZONO').map(a => a.uzytkownik).join(', ');
  const wiersz = d.typ === 'faktura' ? S.faktury[d.id] : S.umowy[d.id];
  if (wiersz) Object.assign(wiersz, { zatwierdzil: zatwierdzili, data_akceptacji: teraz() });
  zmienStatus(d, 'ZATWIERDZONY', kto, 'ZATWIERDZONO', szczegoly);
  if (d.typ === 'faktura') zmienStatus(d, 'PRZEKAZANY', SYSTEM, 'PRZEKAZANO', { do: 'Księgowość', sposob: 'powiadomienie e-mail (symulacja)' });
  archiwizuj(d);
  return 'ZARCHIWIZOWANY';
}
function odrzuc(d, kto, komentarz) {
  if (!komentarz || !komentarz.trim()) throw new BladObiegu('Odrzucenie wymaga komentarza.');
  if (d.status !== 'OCZEKUJE_NA_AKCEPTACJE') throw new BladObiegu(`Dokument nie czeka na akceptację (status: ${d.status}).`);
  const { etap } = sprawdzUprawnienia(d, kto);
  decyzja(d, etap, 'ODRZUCONO', komentarz.trim());
  zmienStatus(d, 'ODRZUCONY', kto, 'ODRZUCONO', { komentarz: komentarz.trim() });
  d.plik_docelowy = `odrzucone/${d.nazwa_pliku || d.numer_wplywu + '.pdf'}`;
  d.komentarz = komentarz.trim();
}
function zwroc(d, kto, komentarz) {
  if (!komentarz || !komentarz.trim()) throw new BladObiegu('Zwrot do wyjaśnienia wymaga komentarza.');
  if (d.status !== 'OCZEKUJE_NA_AKCEPTACJE') throw new BladObiegu(`Dokument nie czeka na akceptację (status: ${d.status}).`);
  const { etap } = sprawdzUprawnienia(d, kto);
  decyzja(d, etap, 'ZWROCONO', komentarz.trim());
  zmienStatus(d, 'WYMAGA_WYJASNIENIA', kto, 'ZWROCONO', { komentarz: komentarz.trim() });
  d.komentarz = komentarz.trim();
}

const RE_DO_DATY = /\bdo\s+(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}|\d{4}-\d{2}-\d{2})/i;
function koniecUmowy(okres) {
  if (!okres) return null;
  const t = RE_DO_DATY.exec(okres);
  if (!t) return null;
  const s = t[1];
  if (/^\d{4}-/.test(s)) return s;
  const [dd, mm, rr] = s.split(/[.\-/]/);
  return `${rr}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}
function terminBrakowania(typ, dataDok, okres) {
  const lata = (RETENCJA[typ] || RETENCJA.inne)[1];
  if (typ === 'umowa') {
    const koniec = koniecUmowy(okres);
    return koniec ? `${+koniec.slice(0, 4) + 1 + lata}-01-01` : null;
  }
  return `${+dataDok.slice(0, 4) + 1 + lata}-01-01`;
}
function archiwizuj(d) {
  const dataDok = d.data_dokumentu || d.data_wplywu.slice(0, 10);
  const cel = `archiwum/${dataDok.slice(0, 4)}/${dataDok.slice(5, 7)}/${KATALOGI_TYPOW[d.typ] || 'Inne'}/${d.dzial || 'Bez działu'}/${d.nazwa_pliku}`;
  if (S.dokumenty.some(x => x.id !== d.id && x.plik_docelowy === cel)) throw new BladObiegu(`W archiwum jest już plik ${d.nazwa_pliku}.`);
  const kategoria = (RETENCJA[d.typ] || RETENCJA.inne)[0];
  const okres = d.typ === 'umowa' && S.umowy[d.id] ? S.umowy[d.id].okres_obowiazywania : null;
  const termin = terminBrakowania(d.typ, dataDok, okres);
  const czas = teraz();
  Object.assign(d, { plik_docelowy: cel, archived_at: czas, kategoria_retencji: kategoria, termin_brakowania: termin, wersja: 1 });
  S.id.wersje += 1;
  S.wersje.push({ id: S.id.wersje, dokument_id: d.id, wersja: 1, plik: cel, sha256: null, sha256_zrodla: d.sha256,
    powod: 'archiwizacja', uzytkownik: SYSTEM, czas });
  zmienStatus(d, 'ZARCHIWIZOWANY', SYSTEM, 'ZARCHIWIZOWANO', { plik: cel, kategoria,
    termin_brakowania: termin || 'po wygaśnięciu umowy (umowa na czas nieokreślony)' });
}

// ------------------------------------------------------------------ wyszukiwarka

function szukaj(f) {
  return widoczne().filter(d => {
    const fa = S.faktury[d.id];
    if (f.typ && (d.typ || d.typ_proponowany) !== f.typ) return false;
    if (f.status && d.status !== f.status) return false;
    if (f.kontrahent && !(d.kontrahent_norm || '').includes(normalizuj(f.kontrahent))) return false;
    if (f.numer) {
      const w = normalizuj(f.numer).replace(/ /g, '');
      const pola = [d.numer_wplywu, d.numer_rejestrowy, fa && fa.numer_faktury_norm].map(x => (x || '').toLowerCase());
      if (!pola.some(p => p.includes(w))) return false;
    }
    if (f.fraza && !(d.tekst_norm || '').includes(normalizuj(f.fraza))) return false;
    return true;
  }).sort((a, b) => (b.data_dokumentu || b.data_wplywu.slice(0, 10)).localeCompare(a.data_dokumentu || a.data_wplywu.slice(0, 10)) || b.id - a.id);
}

// ------------------------------------------------------------------ elementy interfejsu

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

function chipStatusu(status) {
  return `<span class="chip ${KOLORY_STATUSOW[status] || 'szary'}">${esc(OPISY_STATUSOW[status] || status)}</span>`;
}
function typOpis(d) {
  const t = d.typ || d.typ_proponowany;
  if (!t) return 'nierozpoznany';
  return NAZWY_TYPOW[t] + (d.typ ? '' : ' (propozycja)');
}
function terminOpis(d, termin) {
  if (!termin) return '';
  let tekst = formatujDate(termin);
  if (NIEZATWIERDZONE.includes(d.status)) {
    const dni = dniMiedzy(S.data, termin);
    const klasa = dni < 0 ? 'czerwony' : dni <= DNI_ALERTU ? 'pomaranczowy' : '';
    tekst = `${tekst} · ${opisDni(dni)}`;
    if (klasa) return `<span class="termin ${klasa}">${esc(tekst)}</span>`;
  }
  return esc(tekst);
}

function toast(tekst, rodzaj = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${rodzaj}`;
  el.textContent = tekst;
  $('#toasty').appendChild(el);
  requestAnimationFrame(() => el.classList.add('widoczny'));
  setTimeout(() => { el.classList.remove('widoczny'); setTimeout(() => el.remove(), 300); }, 5200);
}

function podglad(d, maksStron = 3) {
  if (!d.strony) return '<div class="brak-podgladu">Brak podglądu pliku.</div>';
  const strony = [];
  for (let i = 1; i <= Math.min(d.strony, maksStron); i++) {
    strony.push(`<button class="strona" data-powieksz="dane/img/${esc(d.numer_wplywu)}-${i}.jpg" aria-label="Powiększ stronę ${i}">
      <img src="dane/img/${esc(d.numer_wplywu)}-${i}.jpg" alt="Strona ${i} dokumentu ${esc(d.numer_wplywu)}" loading="lazy">
      ${d.strony > 1 ? `<span class="nr-strony">Strona ${i} z ${d.strony}</span>` : ''}</button>`);
  }
  return `<div class="strony">${strony.join('')}</div><p class="podpis">Kliknij, żeby powiększyć.</p>`;
}

function tabela(kolumny, wiersze, trasa, wybrany) {
  if (!wiersze.length) return '';
  const naglowek = kolumny.map(k => `<th>${esc(k[0])}</th>`).join('');
  const tresc = wiersze.map(d => `<tr class="${wybrany && d.numer_wplywu === wybrany ? 'wybrany' : ''}" data-trasa="${trasa ? esc(trasa + d.numer_wplywu) : ''}" tabindex="${trasa ? 0 : -1}">
    ${kolumny.map(k => `<td>${k[1](d)}</td>`).join('')}</tr>`).join('');
  return `<div class="tabela-wrap"><table class="tabela ${trasa ? 'klikalna' : ''}"><thead><tr>${naglowek}</tr></thead><tbody>${tresc}</tbody></table></div>`;
}

const KOL = {
  numer: ['Nr wpływu', d => `<b>${esc(d.numer_wplywu)}</b>`],
  rejestr: ['Nr rejestrowy', d => esc(d.numer_rejestrowy || '—')],
  plik: ['Plik', d => esc(d.plik_oryginalny)],
  typ: ['Typ', d => esc(typOpis(d))],
  status: ['Status', d => chipStatusu(d.status) + (d.blad ? ' <span class="chip czerwony" title="Oznaczony jako błędny">⚠ błąd</span>' : '')],
  termin: ['Termin płatności', d => terminOpis(d, terminDokumentu(d))],
  kontrahent: ['Kontrahent', d => esc(d.kontrahent || '')],
  kwota: ['Kwota', d => `<span class="liczba">${esc(d.kwota_brutto !== null && d.kwota_brutto !== undefined ? formatujKwote(d.kwota_brutto) : '')}</span>`],
  dzial: ['Dział', d => esc(d.dzial || '')],
  dataDok: ['Data dok.', d => esc(formatujDate(d.data_dokumentu))],
  wplyw: ['Wpływ', d => esc(formatujCzas(d.data_wplywu))],
  akceptuje: ['Akceptuje teraz', d => { const b = biezacyEtap(d); return b ? `${esc(nazwa(b.etap.login))} <span class="wyciszone">(${b.numer + 1} z ${b.etapy.length})</span>` : ''; }],
};

function historiaHtml(d) {
  const wiersze = S.historia.filter(h => h.dokument_id === d.id).map(h => {
    let sz = h.szczegoly;
    if (sz && typeof sz === 'object') {
      sz = Object.entries(sz).filter(([, v]) => v !== null && v !== '' && !(typeof v === 'object' && !Object.keys(v).length))
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ');
    }
    return `<tr><td class="nowrap">${esc(formatujCzas(h.czas))}</td><td>${esc(nazwa(h.uzytkownik))}</td>
      <td>${esc(OPISY_ZDARZEN[h.zdarzenie] || h.zdarzenie)}</td><td class="szczegoly">${esc(bezOznaczen(sz))}</td></tr>`;
  }).join('');
  return `<div class="tabela-wrap"><table class="tabela historia"><thead><tr><th>Czas</th><th>Kto</th><th>Zdarzenie</th><th>Szczegóły</th></tr></thead><tbody>${wiersze}</tbody></table></div>`;
}

function daneDokumentuHtml(d) {
  const dane = daneTypu(d) || {};
  const linie = [];
  if (POLA_TYPU[d.typ]) {
    for (const [pole, etykieta, rodzaj] of POLA_TYPU[d.typ]) {
      let w = dane[pole];
      if (pole === 'kontrahent' && d.typ === 'umowa') w = d.kontrahent;
      if ((pole === 'tytul' || pole === 'data') && (d.typ === 'inne' || d.typ === 'umowa') && (w === null || w === undefined)) {
        w = pole === 'tytul' ? d.tytul : d.data_dokumentu;
      }
      if (w === null || w === undefined || w === '') continue;
      if (rodzaj === 'kwota') w = zl(+w);
      else if (rodzaj === 'data') w = formatujDate(w);
      linie.push(`<dt>${esc(etykieta)}</dt><dd>${esc(w)}</dd>`);
    }
  }
  if (d.dzial) linie.push(`<dt>Dział</dt><dd>${esc(d.dzial)}</dd>`);
  if (d.zweryfikowal) linie.push(`<dt>Zweryfikował(a)</dt><dd>${esc(nazwa(d.zweryfikowal))}</dd>`);
  return linie.length ? `<dl class="dane">${linie.join('')}</dl>` : '';
}

const IKONY_ETAPOW = { zatwierdzono: '✓', teraz: '•', czeka: '', odrzucono: '✕', 'zwrócono': '↩', 'nie dotyczy': '' };
function etapyHtml(d) {
  const przebieg = przebiegAkceptacji(d);
  if (!przebieg.length) return '';
  return `<ol class="etapy">${przebieg.map((e, i) => `<li class="etap ${e.stan.replace(/\s|ó/g, '')}">
    <span class="znak">${IKONY_ETAPOW[e.stan] || (i + 1)}</span>
    <div><b>${esc(NAZWY_POZIOMOW[e.etap.poziom])}</b> — ${esc(nazwa(e.etap.login))}
    <div class="wyciszone">${e.stan === 'teraz' ? '<span class="niebieski-tekst">czeka na decyzję</span>' : e.czas ? `${esc(e.stan)} ${esc(formatujCzas(e.czas))}` : esc(e.stan)}
    ${e.komentarz ? ` · „${esc(e.komentarz)}”` : ''}</div></div></li>`).join('')}</ol>`;
}

// ------------------------------------------------------------------ nawigacja i trasy

const STRONY = [
  ['pulpit', 'Pulpit', '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>'],
  ['wplyw', 'Wpływ (INBOX)', '<path d="M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6z"/>'],
  ['weryfikacja', 'Weryfikacja', '<path d="M9 11l2 2 4-4M5 4h14v16H5z"/>'],
  ['akceptacja', 'Akceptacja', '<path d="M4 12l5 5L20 6"/>'],
  ['archiwum', 'Archiwum', '<path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/>'],
];

function trasa() {
  const [, strona = 'pulpit', numer = ''] = (location.hash || '#/pulpit').split('/');
  return { strona: STRONY.some(s => s[0] === strona) ? strona : 'pulpit', numer: decodeURIComponent(numer) };
}
const idzDo = (strona, numer) => { location.hash = `#/${strona}${numer ? '/' + numer : ''}`; };

function nawigacja() {
  const t = trasa();
  const liczby = {
    wplyw: wInbox().length,
    weryfikacja: widoczne().filter(d => ['DO_WERYFIKACJI', 'WYMAGA_WYJASNIENIA'].includes(d.status)).length,
    akceptacja: doAkceptacjiPrzez(ja).length,
  };
  $('#nawigacja').innerHTML = STRONY.map(([id, etykieta, ikona]) => `
    <a href="#/${id}" class="${t.strona === id ? 'aktywna' : ''}" data-tour="nav-${id}">
      <svg viewBox="0 0 24 24" aria-hidden="true">${ikona}</svg><span>${esc(etykieta)}</span>
      ${liczby[id] ? `<span class="licznik">${liczby[id]}</span>` : ''}</a>`).join('');
}

function render() {
  const t = trasa();
  nawigacja();
  const widok = $('#widok');
  widok.innerHTML = ({ pulpit: widokPulpit, wplyw: widokWplyw, weryfikacja: widokWeryfikacja, akceptacja: widokAkceptacja, archiwum: widokArchiwum })[t.strona](t.numer);
  podepnij(widok, t);
}

function poAkcji(tekst, rodzaj = 'ok') {
  zapisz();
  if (tekst) toast(tekst, rodzaj);
  render();
}

// ------------------------------------------------------------------ widok: pulpit

function widokPulpit() {
  const w = widoczne();
  const ile = st => w.filter(d => d.status === st).length;
  const al = alerty();
  const wObiegu = w.filter(d => NIEZATWIERDZONE.includes(d.status)).length;
  const kafelki = [
    ['W obiegu', wObiegu, null, 'Dokumenty, które nie skończyły obiegu'],
    ['Do weryfikacji', ile('DO_WERYFIKACJI'), 'weryfikacja'],
    ['Wymaga wyjaśnienia', ile('WYMAGA_WYJASNIENIA'), 'weryfikacja'],
    ['W akceptacji', ile('OCZEKUJE_NA_AKCEPTACJE'), 'akceptacja'],
    ['Alerty terminów', al.length, null, 'Niezatwierdzone faktury z terminem płatności za 3 dni lub wcześniej'],
    ['Zarchiwizowane', ile('ZARCHIWIZOWANY'), 'archiwum'],
  ];
  const kolejnosc = ['DO_WERYFIKACJI', 'WYMAGA_WYJASNIENIA', 'OCZEKUJE_NA_AKCEPTACJE', 'ZARCHIWIZOWANY', 'ODRZUCONY', 'DUPLIKAT'];
  const maks = Math.max(1, ...kolejnosc.map(ile));
  const oczekujace = w.filter(d => d.status === 'OCZEKUJE_NA_AKCEPTACJE');
  const obciazenie = {};
  for (const d of oczekujace) { const b = biezacyEtap(d); if (b) obciazenie[b.etap.login] = (obciazenie[b.etap.login] || 0) + 1; }
  const inbox = wInbox().length;

  return `
  <div class="naglowek"><h1>Pulpit</h1>
  <p class="podtytul">Stan na ${formatujDate(S.data)} (data systemowa). Dokumentów w rejestrze: <b>${w.length}</b>.</p></div>
  ${inbox ? `<div class="baner"><div><b>W INBOX czeka ${inbox} ${inbox === 1 ? 'nowy dokument' : inbox < 5 ? 'nowe dokumenty' : 'nowych dokumentów'}.</b> Przyjmij je, żeby zacząć obieg.</div><a class="btn glowny" href="#/wplyw">Przejdź do wpływu</a></div>` : ''}
  <div class="kafelki">${kafelki.map(([et, wart, strona, pomoc]) => `
    <${strona ? `a href="#/${strona}"` : 'div'} class="kafelek" ${pomoc ? `title="${esc(pomoc)}"` : ''}>
      <span class="et">${esc(et)}</span><span class="wart">${wart}</span>
    </${strona ? 'a' : 'div'}>`).join('')}</div>

  <section class="karta" data-tour="alerty">
    <h2>Terminy płatności</h2>
    ${al.length ? `<p class="podpis">Faktury, które nie są jeszcze zatwierdzone, a termin płatności mija za 3 dni lub już minął. Przed weryfikacją termin pochodzi z odczytu OCR.</p>
    <ul class="alerty">${al.map(a => `<li>
      <span class="chip ${a.dni < 0 ? 'czerwony' : 'pomaranczowy'}">${esc(opisDni(a.dni))}</span>
      <span class="alert-tresc"><b>${esc(a.d.numer_rejestrowy || a.d.numer_wplywu)}</b> · ${esc(a.kontrahent || '—')} · ${esc(zl(a.kwota))} · termin ${esc(formatujDate(a.termin))} · ${esc(OPISY_STATUSOW[a.d.status].toLowerCase())}${a.potwierdzony ? '' : ' · <i>termin z OCR</i>'}</span>
      <a class="btn maly" href="#/${a.d.status === 'OCZEKUJE_NA_AKCEPTACJE' ? 'akceptacja' : 'weryfikacja'}/${esc(a.d.numer_wplywu)}">Otwórz</a></li>`).join('')}</ul>`
    : '<p class="sukces">Brak niezatwierdzonych faktur z bliskim terminem płatności.</p>'}
  </section>

  <div class="dwie-kolumny">
    <section class="karta"><h2>Gdzie są dokumenty</h2>
      <div class="slupki">${kolejnosc.map(st => `<div class="slupek"><span class="et">${esc(OPISY_STATUSOW[st])}</span>
        <span class="pasek"><span style="width:${(ile(st) / maks) * 100}%"></span></span><span class="wart">${ile(st)}</span></div>`).join('')}</div>
    </section>
    <section class="karta"><h2>Kto ma dokumenty do akceptacji</h2>
      ${Object.keys(obciazenie).length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Akceptujący</th><th>Dokumentów</th></tr></thead><tbody>
      ${Object.entries(obciazenie).sort((a, b) => b[1] - a[1]).map(([l, n]) => `<tr><td>${esc(nazwa(l))}</td><td class="liczba">${n}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="wyciszone">Nic nie czeka na akceptację.</p>'}
    </section>
  </div>`;
}

// ------------------------------------------------------------------ widok: wpływ

let przyjmowanie = false;

function widokWplyw() {
  const inbox = wInbox();
  const wyniki = S.ostatniePrzyjecie;
  const ostatnie = widoczne().slice().sort((a, b) => b.id - a.id).slice(0, 10);
  return `
  <div class="naglowek"><h1>Wpływ dokumentów (INBOX)</h1>
  <p class="podtytul">Krok 1–2: plik trafia do INBOX → numer wpływu i SHA-256 (wykrywa ten sam plik) → OCR → rozpoznanie typu i pól.</p></div>
  <section class="karta" data-tour="inbox">
    <h2>W INBOX: ${inbox.length}</h2>
    ${inbox.length ? `${tabela([['Plik', d => `<b>${esc(d.plik_oryginalny)}</b>`], ['Rodzaj', d => esc(d.zrodlo === 'skan' ? 'skan (zdjęcie)' : 'PDF')]], inbox)}
    <div class="akcje"><button class="btn glowny" id="przyjmij" ${przyjmowanie ? 'disabled' : ''}>Przyjmij dokumenty z INBOX (${inbox.length})</button></div>
    <div id="postep" class="postep" hidden><div class="pasek"><span></span></div><p class="podpis"></p></div>`
    : `<p class="wyciszone">INBOX jest pusty.</p>`}
    <p class="uwaga">W tej wersji demo nie dodasz własnych plików: odczyt tekstu (OCR) działa w pełnej wersji programu na komputerze.
    Dokumenty w INBOX zostały wcześniej odczytane przez ten sam program.</p>
  </section>
  ${wyniki ? `<section class="karta"><h2>Wynik przyjęcia</h2>
    ${tabela([KOL.plik, KOL.numer, KOL.status, ['Komunikat', d => esc(wyniki[d.numer_wplywu] || '')]],
      Object.keys(wyniki).map(dokPoNumerze).filter(Boolean))}
    <div class="akcje"><a class="btn glowny" href="#/weryfikacja">Przejdź do weryfikacji</a></div></section>` : ''}
  <section class="karta"><h2>Ostatnio przyjęte</h2>
    ${tabela([KOL.numer, KOL.plik, KOL.typ, KOL.status, KOL.wplyw], ostatnie, '#/archiwum/')}
  </section>`;
}

function przyjmijInbox() {
  return new Promise(gotowe => {
    const inbox = wInbox();
    if (!inbox.length || przyjmowanie) { gotowe(); return; }
    przyjmowanie = true;
    const btn = $('#przyjmij');
    if (btn) btn.disabled = true;
    const postep = $('#postep');
    if (postep) postep.hidden = false;
    const wyniki = {};
    let i = 0;
    const krok = () => {
      if (i >= inbox.length) {
        S.ostatniePrzyjecie = wyniki;
        przyjmowanie = false;
        poAkcji(`Przyjęto ${inbox.length} dokumentów. Czekają na weryfikację.`);
        gotowe();
        return;
      }
      const d = inbox[i];
      const pasek = $('#postep .pasek span'), podpis = $('#postep .podpis');
      if (pasek) pasek.style.width = `${((i + 1) / inbox.length) * 100}%`;
      if (podpis) podpis.textContent = `${i + 1}/${inbox.length}: ${d.plik_oryginalny} — ${d.zrodlo === 'skan' ? 'OCR i rozpoznanie' : 'odczyt tekstu i rozpoznanie'}…`;
      setTimeout(() => { wyniki[d.numer_wplywu] = przyjmijDokument(d); i += 1; krok(); }, d.zrodlo === 'skan' ? 650 : 380);
    };
    krok();
  });
}

// ------------------------------------------------------------------ widok: weryfikacja

function widokWeryfikacja(numer) {
  const kolejka = wgPilnosci(widoczne().filter(d => ['DO_WERYFIKACJI', 'WYMAGA_WYJASNIENIA'].includes(d.status)));
  const naglowek = `<div class="naglowek"><h1>Weryfikacja danych</h1>
    <p class="podtytul">Krok 3: porównaj skan z formularzem, popraw dane i zatwierdź. System proponuje — człowiek zatwierdza.</p></div>`;
  if (!kolejka.length) {
    return `${naglowek}<section class="karta"><p class="sukces">Brak dokumentów do weryfikacji.</p>
      ${wInbox().length ? '<a class="btn glowny" href="#/wplyw">Przejdź do wpływu dokumentów</a>' : ''}</section>`;
  }
  const d = kolejka.find(x => x.numer_wplywu === numer) || kolejka[0];
  return `${naglowek}
  <section class="karta kolejka"><h2>Kolejka: ${kolejka.length} <span class="wyciszone">— najpierw faktury z najbliższym terminem płatności</span></h2>
    ${tabela([KOL.numer, KOL.plik, KOL.typ, KOL.status, KOL.termin], kolejka, '#/weryfikacja/', d.numer_wplywu)}</section>
  <div class="szczegoly">
    <section class="karta podglad" data-tour="skan">
      <h2>${esc(d.numer_wplywu)} · ${esc(d.plik_oryginalny)}</h2>
      <p class="podpis">Status: ${chipStatusu(d.status)} · źródło: ${esc(d.zrodlo)} · tekst: ${d.ocr_wykonany ? `OCR (jakość ${Math.round(d.ocr_pewnosc * 100)}%)` : 'warstwa tekstowa PDF'}</p>
      ${podglad(d)}
    </section>
    <section class="karta formularz" data-tour="formularz">${formularzWeryfikacji(d)}</section>
  </div>
  <details class="karta"><summary>Historia operacji</summary>${historiaHtml(d)}</details>`;
}

function formularzWeryfikacji(d) {
  const termin = terminDokumentu(d);
  let ostrzezenieTerminu = '';
  if (termin) {
    const dni = dniMiedzy(S.data, termin);
    if (dni < 0) ostrzezenieTerminu = `<div class="komunikat blad"><b>Termin płatności minął:</b> ${esc(formatujDate(termin))} · ${esc(opisDni(dni))}. Zweryfikuj w pierwszej kolejności.</div>`;
    else if (dni <= DNI_ALERTU) ostrzezenieTerminu = `<div class="komunikat ostrzezenie"><b>Bliski termin płatności:</b> ${esc(formatujDate(termin))} · ${esc(opisDni(dni))}.</div>`;
  }
  const doWyjasnienia = d.status === 'WYMAGA_WYJASNIENIA';
  const opis = (d.typ_dowody || {}).opis;
  const biezacyTyp = d.typ || d.typ_proponowany;
  const sugestia = (d.ostrzezenia.join(' ').match(/WP-\d{4}-\d{5}/) || [''])[0];
  return `${ostrzezenieTerminu}
    ${doWyjasnienia ? `<div class="komunikat ostrzezenie" data-tour="wyjasnienie"><b>Wymaga wyjaśnienia:</b> ${esc(d.komentarz)}<br>Wyjaśnij sprawę, popraw dane i zatwierdź je tutaj (opisz, co ustalono) — albo oznacz duplikat.</div>`
      : opis ? `<div class="komunikat ${d.typ_proponowany ? 'info' : 'ostrzezenie'}">${esc(opis)}</div>` : ''}
    ${d.ostrzezenia.map(o => `<div class="komunikat ostrzezenie">${esc(o)}</div>`).join('')}
    ${d.blad ? `<div class="komunikat blad"><b>Wcześniej oznaczony jako błędny:</b> ${esc(d.opis_bledu)}</div>` : ''}
    <label class="pole"><span>Typ dokumentu</span>
      <select id="typ"><option value="" ${biezacyTyp ? '' : 'selected'} disabled>Wybierz typ dokumentu</option>
      ${TYPY.map(t => `<option value="${t}" ${t === biezacyTyp ? 'selected' : ''}>${NAZWY_TYPOW[t]}</option>`).join('')}</select></label>
    <div id="pola">${biezacyTyp ? polaFormularza(d, biezacyTyp) : '<p class="wyciszone">Wybierz typ, żeby zobaczyć pola.</p>'}</div>
    ${doWyjasnienia ? `<label class="pole" data-pole="wyjasnienie"><span>Jak sprawa została wyjaśniona? <span class="wymagane">*</span></span>
      <textarea id="wyjasnienie" rows="2" placeholder="np. dostawca przesłał numer zamówienia ZAM/2026/118"></textarea><small class="blad-pola"></small></label>` : ''}
    <div class="blok-bledu" data-tour="blad">
      <label class="przelacznik"><input type="checkbox" id="z-bledem" ${d.blad ? 'checked' : ''}><span><b>Oznacz jako błędny</b> i przekaż do decyzji akceptującego</span></label>
      <p class="podpis">Np. zły NIP, kwoty się nie sumują, brak terminu. Walidacje nie zablokują zatwierdzenia, a akceptujący zobaczy oznaczenie i zdecyduje: zatwierdzić, zwrócić albo odrzucić. Pismo lub „inne” z błędem trafia do kierownika działu.</p>
      <label class="pole" data-pole="opis_bledu" ${d.blad ? '' : 'hidden'}><span>Opis błędu <span class="wymagane">*</span></span>
        <input id="opis-bledu" value="${esc(d.opis_bledu || '')}" placeholder="np. netto + VAT nie równa się brutto na fakturze" autocomplete="off"><small class="blad-pola"></small></label>
    </div>
    <div class="bledy" id="bledy"></div>
    <div class="akcje"><button class="btn glowny" id="zatwierdz-dane" data-tour="zatwierdz-dane">Zatwierdź dane</button></div>
    <details class="inne"><summary>Inne czynności: duplikat${doWyjasnienia ? '' : ', wyjaśnienie'}</summary>
      <label class="pole"><span>Oznacz jako duplikat — numer wpływu lub rejestrowy oryginału</span>
        <input id="oryginal" value="${esc(sugestia)}" placeholder="np. WP-2026-00008"></label>
      <div class="akcje"><button class="btn" id="duplikat">Oznacz jako duplikat</button></div>
      ${doWyjasnienia ? '' : `<label class="pole"><span>Co wymaga wyjaśnienia?</span><textarea id="powod" rows="2"></textarea></label>
      <div class="akcje"><button class="btn" id="do-wyjasnienia">Przekaż do wyjaśnienia</button></div>`}
    </details>`;
}

/* Dane zatwierdzone wcześniej (np. przed zwrotem do wyjaśnienia) mają pierwszeństwo przed odczytem OCR. */
function zatwierdzoneWczesniej(d, typ) {
  if (d.typ !== typ) return {};
  const dane = Object.fromEntries(Object.entries(daneTypu(d) || {}).filter(([, v]) => v !== null && v !== undefined));
  if (typ === 'umowa' || typ === 'inne') {
    for (const [k, v] of [['kontrahent', d.kontrahent], ['tytul', d.tytul], ['data', d.data_dokumentu]]) if (v !== null && v !== undefined) dane[k] = v;
  }
  return dane;
}

function polaFormularza(d, typ) {
  const prop = d.propozycje || {};
  const zatw = zatwierdzoneWczesniej(d, typ);
  const dzialProp = d.dzial || (prop.dzial || {}).wartosc;
  const pola = POLA_TYPU[typ].map(([pole, etykieta, rodzaj]) => {
    const zZatw = pole in zatw;
    const p = zZatw ? {} : (prop[pole] || {});
    let w = zZatw ? zatw[pole] : (p.wartosc ?? '');
    if (rodzaj === 'kwota') w = w === '' ? '' : kwotaDoPola(+w);
    const pewnosc = zZatw ? '<span class="pewnosc zatwierdzone" title="Wartość zatwierdzona wcześniej przez operatora">zatwierdzone</span>'
      : p.wartosc !== undefined && p.wartosc !== null && p.pewnosc !== undefined
        ? `<span class="pewnosc ${p.pewnosc < 0.7 ? 'niska' : ''}" title="Propozycja systemu, metoda: ${esc(p.metoda)}">odczyt ${Math.round(p.pewnosc * 100)}%</span>` : '';
    const wymagane = (POLA_OBOWIAZKOWE[typ] || {})[pole] ? ' <span class="wymagane" title="pole obowiązkowe">*</span>' : '';
    const pole_ = rodzaj === 'data' ? `<input type="date" name="${pole}" value="${esc(w)}">`
      : rodzaj === 'tekst_dlugi' ? `<textarea name="${pole}" rows="2">${esc(w)}</textarea>`
      : `<input name="${pole}" value="${esc(w)}" ${rodzaj === 'kwota' ? 'inputmode="decimal"' : ''} ${rodzaj === 'nip' ? 'inputmode="numeric"' : ''} autocomplete="off">`;
    return `<label class="pole ${rodzaj === 'tekst_dlugi' ? 'szerokie' : ''}" data-pole="${pole}"><span>${esc(etykieta)}${wymagane}${pewnosc}</span>${pole_}
      ${p.pewnosc !== undefined && p.pewnosc < 0.7 && p.wartosc ? '<small class="niska-pewnosc">Niska pewność odczytu — sprawdź na skanie.</small>' : ''}<small class="blad-pola"></small></label>`;
  }).join('');
  return `<div class="pola">${pola}
    <label class="pole" data-pole="dzial"><span>Dział <span class="wymagane">*</span>${!d.dzial && dzialProp ? '<span class="pewnosc" title="Propozycja na podstawie historii kontrahenta">z historii kontrahenta</span>' : ''}</span>
      <select name="dzial"><option value="" ${dzialProp ? '' : 'selected'}>Wybierz dział</option>
      ${DZIALY.map(z => `<option ${z === dzialProp ? 'selected' : ''}>${z}</option>`).join('')}</select><small class="blad-pola"></small></label>
    <label class="pole"><span>Osoba odpowiedzialna (opcjonalnie)</span><input name="osoba" value="${esc(d.osoba_odpowiedzialna || '')}" autocomplete="off"></label>
  </div>`;
}

function pokazBledy(kontener, problemy) {
  $$('.blad-pola', kontener).forEach(e => { e.textContent = ''; });
  $$('.pole.z-bledem', kontener).forEach(e => e.classList.remove('z-bledem'));
  const ogolne = [];
  for (const p of problemy) {
    const pole = p.pole && $(`[data-pole="${p.pole}"]`, kontener);
    if (pole && p.blokuje) {
      pole.classList.add('z-bledem');
      $('.blad-pola', pole).textContent = p.komunikat;
    } else {
      ogolne.push(`<div class="komunikat ${p.blokuje ? 'blad' : 'ostrzezenie'}">${esc(p.komunikat)}</div>`);
    }
  }
  $('#bledy', kontener).innerHTML = ogolne.join('');
  const pierwszy = $('.z-bledem, #bledy .komunikat', kontener);
  if (pierwszy) pierwszy.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ------------------------------------------------------------------ widok: akceptacja

let tylkoMoje = null;

function widokAkceptacja(numer) {
  const uz = PO_LOGINIE[ja];
  if (tylkoMoje === null) tylkoMoje = uz.rola !== 'operator';
  const lista = wgPilnosci(tylkoMoje ? doAkceptacjiPrzez(ja) : widoczne().filter(d => d.status === 'OCZEKUJE_NA_AKCEPTACJE'));
  const p = S.progi;
  const kw = k => formatujKwote(k).replace(/,00$/, '') + ' zł';
  const reguly = `<details class="karta reguly" data-tour="reguly" ${uz.rola === 'operator' ? 'open' : ''}><summary>Reguły akceptacji</summary><ul>
    <li><b>Faktura do ${kw(p.dyrektor)}</b> brutto: kierownik działu</li>
    <li><b>powyżej ${kw(p.dyrektor)}</b>: kierownik działu → dyrektor</li>
    <li><b>powyżej ${kw(p.finanse)}</b>: kierownik działu → dyrektor → finanse</li>
    <li><b>Umowa</b>: dyrektor · <b>pismo, inne</b>: bez akceptacji</li>
    <li>Etapy idą po kolei. Zwrot do wyjaśnienia zaczyna akceptację od nowa. Osoba, która weryfikowała dokument, nie akceptuje go (rozdział obowiązków).</li></ul></details>`;
  const naglowek = `<div class="naglowek"><h1>Akceptacja</h1>
    <p class="podtytul">Krok 5: akceptujący zatwierdza, zwraca do wyjaśnienia albo odrzuca (komentarz obowiązkowy).</p></div>
    ${uz.rola === 'operator' ? '<div class="komunikat info">Działasz jako operator. Żeby zaakceptować dokument, przełącz osobę w polu „Działam jako” albo kliknij „Przełącz na tę osobę” przy dokumencie.</div>' : ''}
    ${reguly}
    <label class="przelacznik"><input type="checkbox" id="tylko-moje" ${tylkoMoje ? 'checked' : ''}><span>Tylko dokumenty czekające na moją akceptację</span></label>`;
  if (!lista.length) {
    return `${naglowek}<section class="karta"><p class="sukces">${tylkoMoje ? 'Nic nie czeka na Twoją akceptację.' : 'Brak dokumentów oczekujących na akceptację.'}</p>
      ${tylkoMoje ? '<p class="wyciszone">Odznacz „Tylko dokumenty czekające na moją akceptację”, żeby zobaczyć wszystkie i sprawdzić, kto je akceptuje.</p>' : ''}</section>`;
  }
  const d = lista.find(x => x.numer_wplywu === numer) || lista[0];
  const b = biezacyEtap(d);
  const termin = (S.faktury[d.id] || {}).termin_platnosci;
  const powod = [...S.historia].reverse().find(h => h.dokument_id === d.id && h.zdarzenie === 'WYSLANO_DO_AKCEPTACJI' && h.szczegoly && h.szczegoly.powod);
  return `${naglowek}
  <section class="karta kolejka">${tabela([KOL.rejestr, KOL.typ, KOL.kontrahent, KOL.kwota, KOL.dzial, KOL.termin, KOL.akceptuje], lista, '#/akceptacja/', d.numer_wplywu)}</section>
  <div class="szczegoly">
    <section class="karta podglad"><h2>${esc(d.numer_rejestrowy)} · ${esc(d.tytul || '')}</h2>${podglad(d)}</section>
    <section class="karta formularz">
      <p>Status: ${chipStatusu(d.status)}</p>
      ${d.blad ? `<div class="komunikat blad" data-tour="blad-decyzja"><b>Operator oznaczył dokument jako błędny:</b> ${esc(d.opis_bledu)}<br>Zdecyduj: zatwierdź mimo błędu, zwróć do wyjaśnienia albo odrzuć (z komentarzem).</div>` : ''}
      ${termin ? `<p class="podpis">Termin płatności: ${terminOpis(d, termin)}</p>` : ''}
      ${daneDokumentuHtml(d)}
      <div data-tour="sciezka"><h3>Ścieżka akceptacji</h3>${etapyHtml(d)}
      ${powod ? `<p class="podpis">${esc(bezOznaczen(powod.szczegoly.powod))}</p>` : ''}</div>
      ${b && b.etap.login !== ja ? `<div class="komunikat info przelacz">Na tym etapie decyduje: <b>${esc(opisUzytkownika(PO_LOGINIE[b.etap.login]))}</b>.
        <button class="btn maly" id="przelacz" data-login="${esc(b.etap.login)}">Przełącz na tę osobę</button></div>` : ''}
      <label class="pole"><span>Komentarz (obowiązkowy przy zwrocie i odrzuceniu)</span><textarea id="komentarz" rows="2"></textarea></label>
      <div class="bledy" id="bledy"></div>
      <div class="akcje trzy">
        <button class="btn glowny" id="akc-zatwierdz">Zatwierdź</button>
        <button class="btn" id="akc-zwroc">Zwróć</button>
        <button class="btn niebezpieczny" id="akc-odrzuc">Odrzuć</button>
      </div>
    </section>
  </div>
  <details class="karta"><summary>Historia operacji</summary>${historiaHtml(d)}</details>`;
}

// ------------------------------------------------------------------ widok: archiwum

const filtry = { typ: '', status: 'ZARCHIWIZOWANY', kontrahent: '', numer: '', fraza: '' };

function widokArchiwum(numer) {
  const wyniki = szukaj(filtry);
  const wybrany = numer ? dokPoNumerze(numer) : null;
  const d = wybrany && !wybrany.inbox ? wybrany : null;
  let szczegoly = '';
  if (d) {
    const wersje = S.wersje.filter(w => w.dokument_id === d.id).sort((a, b) => b.wersja - a.wersja);
    szczegoly = `<div class="szczegoly" id="szczegoly-archiwum">
      <section class="karta formularz">
        <h2>${esc(d.numer_rejestrowy || d.numer_wplywu)} · ${esc(d.tytul || d.plik_oryginalny)}</h2>
        <p>Status: ${chipStatusu(d.status)}</p>
        ${d.blad ? `<div class="komunikat blad"><b>Oznaczony jako błędny:</b> ${esc(d.opis_bledu)}</div>` : ''}
        ${daneDokumentuHtml(d)}
        ${przebiegAkceptacji(d).length ? `<h3>Akceptacja</h3>${etapyHtml(d)}` : ''}
        <div data-tour="archiwum-dane">
        ${d.archived_at ? `<h3>Archiwum</h3><dl class="dane">
          <dt>Zarchiwizowano</dt><dd>${esc(formatujCzas(d.archived_at))}</dd>
          <dt>Kategoria / brakowanie</dt><dd>${esc(d.kategoria_retencji)}, ${d.termin_brakowania ? `możliwe od ${esc(formatujDate(d.termin_brakowania))}` : 'termin ustala się po wygaśnięciu umowy'}</dd>
          <dt>Plik (wersja ${d.wersja})</dt><dd><code>${esc(d.plik_docelowy)}</code> <span class="wyciszone">tylko do odczytu</span></dd>
        </dl>` : d.plik_docelowy ? `<dl class="dane"><dt>Plik</dt><dd><code>${esc(d.plik_docelowy)}</code></dd></dl>` : ''}
        <dl class="dane"><dt>Plik oryginalny</dt><dd>${esc(d.plik_oryginalny)} <span class="wyciszone">SHA-256 ${esc(d.sha256.slice(0, 16))}…</span></dd>
          ${d.komentarz ? `<dt>Komentarz</dt><dd>${esc(d.komentarz)}</dd>` : ''}</dl>
        ${wersje.length ? `<h3>Wersje pliku</h3><ul class="wersje">${wersje.map(w => `<li><b>Wersja ${w.wersja}</b>${w.wersja === d.wersja ? ' (bieżąca)' : ''} · ${esc(formatujCzas(w.czas))} · ${esc(nazwa(w.uzytkownik))} · ${esc(w.powod || '')}</li>`).join('')}</ul>
          <p class="podpis">Plik w archiwum jest tylko do odczytu. Poprawka (np. lepszy skan) to nowa wersja — poprzednie zostają.</p>` : ''}
        </div>
      </section>
      <section class="karta podglad">${podglad(d)}</section>
    </div>
    <details class="karta" open><summary>Historia operacji</summary>${historiaHtml(d)}</details>`;
  }
  const opcje = (lista, wybrana, etykieta) => lista.map(([w, e]) => `<option value="${w}" ${w === wybrana ? 'selected' : ''}>${esc(e)}</option>`).join('');
  return `
  <div class="naglowek"><h1>Archiwum i wyszukiwarka</h1>
  <p class="podtytul">Szukaj po metadanych albo w pełnym tekście dokumentu (OCR). Wielkość liter i polskie znaki nie mają znaczenia.</p></div>
  <section class="karta">
    <form id="filtry" class="filtry" autocomplete="off">
      <label class="pole"><span>Typ</span><select name="typ">${opcje([['', '(wszystkie)'], ...TYPY.map(t => [t, NAZWY_TYPOW[t]])], filtry.typ)}</select></label>
      <label class="pole"><span>Status</span><select name="status">${opcje([['', '(wszystkie)'], ...Object.entries(OPISY_STATUSOW)], filtry.status)}</select></label>
      <label class="pole"><span>Kontrahent</span><input name="kontrahent" value="${esc(filtry.kontrahent)}" placeholder="fragment nazwy"></label>
      <label class="pole"><span>Numer</span><input name="numer" value="${esc(filtry.numer)}" placeholder="wpływu, rejestrowy, faktury"></label>
      <label class="pole szerokie"><span>Szukaj w treści dokumentu</span><input name="fraza" value="${esc(filtry.fraza)}" placeholder="np. sprzątanie, ochrona, abonament"></label>
    </form>
    <p class="podpis">Znaleziono: <b>${wyniki.length}</b>${!d && wyniki.length ? ' · kliknij wiersz, żeby zobaczyć szczegóły' : ''}</p>
    ${tabela([KOL.rejestr, KOL.numer, KOL.typ, KOL.kontrahent, KOL.dataDok, KOL.kwota, KOL.dzial, KOL.status], wyniki, '#/archiwum/', d && d.numer_wplywu)}
  </section>
  ${szczegoly}`;
}

// ------------------------------------------------------------------ zdarzenia

function wykonaj(fn) {
  try { return fn(); } catch (e) {
    if (e instanceof BladWalidacji) { pokazBledy($('#widok'), e.problemy); return null; }
    if (e instanceof BladObiegu) { pokazBledy($('#widok'), [{ pole: null, komunikat: e.message, blokuje: true }]); return null; }
    throw e;
  }
}

function zbierzPola(kontener) {
  const dane = {};
  $$('#pola [name]', kontener).forEach(el => { dane[el.name] = el.value; });
  return dane;
}

function podepnij(widok, t) {
  $$('[data-powieksz]', widok).forEach(el => el.addEventListener('click', () => powieksz(el.dataset.powieksz)));
  $$('tr[data-trasa]', widok).forEach(tr => {
    if (!tr.dataset.trasa) return;
    const idz = () => { location.hash = tr.dataset.trasa; };
    tr.addEventListener('click', idz);
    tr.addEventListener('keydown', e => { if (e.key === 'Enter') idz(); });
  });

  if (t.strona === 'wplyw') {
    const btn = $('#przyjmij', widok);
    if (btn) btn.addEventListener('click', () => przyjmijInbox());
  }

  if (t.strona === 'weryfikacja') {
    const kolejka = wgPilnosci(widoczne().filter(d => ['DO_WERYFIKACJI', 'WYMAGA_WYJASNIENIA'].includes(d.status)));
    const d = kolejka.find(x => x.numer_wplywu === t.numer) || kolejka[0];
    if (!d) return;
    const typ = $('#typ', widok);
    if (typ) typ.addEventListener('change', () => { $('#pola', widok).innerHTML = polaFormularza(d, typ.value); $('#bledy', widok).innerHTML = ''; });
    const zBledem = $('#z-bledem', widok);
    if (zBledem) zBledem.addEventListener('change', () => {
      const pole = $('[data-pole="opis_bledu"]', widok);
      pole.hidden = !zBledem.checked;
      $('#bledy', widok).innerHTML = '';
      if (zBledem.checked) $('#opis-bledu', widok).focus();
    });
    const zatw = $('#zatwierdz-dane', widok);
    if (zatw) zatw.addEventListener('click', () => {
      const dane = zbierzPola(widok);
      const blad = zBledem.checked ? $('#opis-bledu', widok).value : null;
      const wyjasnienie = $('#wyjasnienie', widok) ? $('#wyjasnienie', widok).value : null;
      if (zBledem.checked && !blad.trim()) {
        pokazBledy(widok, [{ pole: 'opis_bledu', komunikat: 'Opisz błąd — akceptujący musi wiedzieć, co jest nie tak.', blokuje: true }]);
        return;
      }
      const ostrzezenia = typ.value ? sprawdzDane(d, typ.value, dane).filter(p => !p.blokuje) : [];
      let status;
      try {
        status = zweryfikuj(d, typ.value, dane, dane.dzial, ja, dane.osoba, wyjasnienie, blad);
      } catch (e) {
        if (!(e instanceof BladObiegu)) throw e;
        const problemy = e.problemy || [{ pole: null, komunikat: e.message, blokuje: true }];
        if (e.problemy && problemy.some(p => !['dzial', 'wyjasnienie'].includes(p.pole))) {
          problemy.push({ pole: null, blokuje: false, komunikat: 'Jeśli dokument naprawdę jest błędny (a nie źle odczytany), zaznacz „Oznacz jako błędny”, opisz błąd i zatwierdź — decyzję podejmie akceptujący.' });
        }
        pokazBledy(widok, problemy);
        return;
      }
      let dalej = status === 'OCZEKUJE_NA_AKCEPTACJE' ? `wysłano do akceptacji: ${opisSciezki(d.sciezka_akceptacji)}` : 'zarchiwizowano (typ nie wymaga akceptacji)';
      if (blad && status === 'OCZEKUJE_NA_AKCEPTACJE') dalej += ' (oznaczony jako błędny)';
      if (ostrzezenia.length) toast(ostrzezenia.map(p => p.komunikat).join(' '), 'uwaga');
      idzDo('weryfikacja');
      poAkcji(`${d.numer_wplywu}: dane zatwierdzone — ${dalej}.`);
    });
    const dup = $('#duplikat', widok);
    if (dup) dup.addEventListener('click', () => {
      const n = $('#oryginal', widok).value;
      if (wykonaj(() => (oznaczDuplikat(d, n, ja), true))) { idzDo('weryfikacja'); poAkcji(`${d.numer_wplywu} oznaczono jako duplikat ${n.trim()}.`); }
    });
    const wyj = $('#do-wyjasnienia', widok);
    if (wyj) wyj.addEventListener('click', () => {
      if (wykonaj(() => (wymagaWyjasnienia(d, $('#powod', widok).value, ja), true))) poAkcji(`${d.numer_wplywu} przekazano do wyjaśnienia.`);
    });
  }

  if (t.strona === 'akceptacja') {
    const cb = $('#tylko-moje', widok);
    if (cb) cb.addEventListener('change', () => { tylkoMoje = cb.checked; render(); });
    const d = t.numer ? dokPoNumerze(t.numer) : null;
    const lista = wgPilnosci(tylkoMoje ? doAkceptacjiPrzez(ja) : widoczne().filter(x => x.status === 'OCZEKUJE_NA_AKCEPTACJE'));
    const dok = (d && lista.includes(d)) ? d : lista[0];
    if (!dok) return;
    const przel = $('#przelacz', widok);
    if (przel) przel.addEventListener('click', () => { ustawRole(przel.dataset.login); tylkoMoje = false; idzDo('akceptacja', dok.numer_wplywu); render(); });
    const kom = () => $('#komentarz', widok).value;
    const nr = dok.numer_rejestrowy;
    $('#akc-zatwierdz', widok).addEventListener('click', () => {
      const wynik = wykonaj(() => zatwierdz(dok, ja, kom().trim() || null));
      if (!wynik) return;
      if (wynik === 'OCZEKUJE_NA_AKCEPTACJE') poAkcji(`${nr}: zatwierdzono na Twoim etapie, przekazano dalej — ${opisEtapu(biezacyEtap(dok).etap)}.`);
      else poAkcji(`${nr} zatwierdzono${dok.typ === 'faktura' ? ', przekazano do księgowości' : ''} i zarchiwizowano.`);
    });
    $('#akc-zwroc', widok).addEventListener('click', () => { if (wykonaj(() => (zwroc(dok, ja, kom()), true))) poAkcji(`${nr} zwrócono do wyjaśnienia.`); });
    $('#akc-odrzuc', widok).addEventListener('click', () => { if (wykonaj(() => (odrzuc(dok, ja, kom()), true))) poAkcji(`${nr} odrzucono.`); });
  }

  if (t.strona === 'archiwum') {
    const form = $('#filtry', widok);
    let czasomierz = null;
    const odswiez = () => {
      new FormData(form).forEach((v, k) => { filtry[k] = String(v); });
      const aktywny = document.activeElement && document.activeElement.name;
      const poz = document.activeElement && document.activeElement.selectionStart;
      render();
      if (aktywny) { const el = $(`#filtry [name="${aktywny}"]`); if (el) { el.focus(); try { el.setSelectionRange(poz, poz); } catch (e) { /* select */ } } }
    };
    form.addEventListener('input', () => { clearTimeout(czasomierz); czasomierz = setTimeout(odswiez, 250); });
    form.addEventListener('submit', e => { e.preventDefault(); odswiez(); });
  }
}

function powieksz(src) {
  const el = document.createElement('div');
  el.className = 'lightbox';
  el.innerHTML = `<button class="zamknij" aria-label="Zamknij">×</button><div class="lightbox-obraz"><img src="${esc(src)}" alt="Podgląd dokumentu"></div>`;
  const zamknij = () => { el.classList.remove('widoczny'); setTimeout(() => el.remove(), 200); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') zamknij(); };
  el.addEventListener('click', e => { if (e.target === el || e.target.classList.contains('zamknij') || e.target.classList.contains('lightbox-obraz')) zamknij(); });
  document.addEventListener('keydown', esc_);
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('widoczny'));
}

function ustawRole(login) {
  ja = login;
  $('#rola').value = login;
  tylkoMoje = PO_LOGINIE[login].rola !== 'operator';
  zapisz();
}

// ------------------------------------------------------------------ samouczek

const KROKI = [
  { tytul: 'Witaj w DocumentFlow',
    tekst: () => `To demo elektronicznego obiegu dokumentów w fikcyjnej firmie. Pokażę w ${KROKI.length} krokach, jak dokument przechodzi od wpływu do archiwum — także co się dzieje, gdy coś jest nie tak. Wszystkie dane są fikcyjne.`,
    trasa: 'pulpit' },
  { tytul: 'Kim jesteś w systemie',
    tekst: 'Tu zmieniasz osobę: operator, kierownicy działów, dyrektor, finanse. Każdy widzi swoje zadania — tak jedna osoba może przejść cały obieg.',
    trasa: 'pulpit', cel: '[data-tour="rola"]' },
  { tytul: 'Wpływ dokumentów',
    tekst: 'W skrzynce czeka 6 nowych plików: faktury, umowa, pismo i jeden duplikat. Kliknij „Dalej”, a system nada numery wpływu, wykryje duplikat pliku i odczyta tekst (OCR).',
    trasa: 'wplyw', cel: '[data-tour="inbox"]', przyDalej: () => przyjmijInbox() },
  { tytul: 'Weryfikacja: człowiek zatwierdza',
    tekst: 'Po lewej skan, po prawej dane odczytane przez system z pewnością odczytu. Porównaj, popraw, wybierz dział i zatwierdź. Zły NIP, niezgodne kwoty albo brak pola zablokują zatwierdzenie.',
    trasa: () => `weryfikacja/${wybierzDoWeryfikacji()}`, cel: '[data-tour="formularz"]' },
  { tytul: 'Dokument naprawdę błędny?',
    tekst: 'Operator nie odrzuca dokumentów. Na tej fakturze kwoty się nie sumują — zaznaczasz „Oznacz jako błędny”, opisujesz błąd i zatwierdzasz. Dokument idzie do akceptującego z czerwonym oznaczeniem, a decyzję podejmuje on.',
    trasa: () => `weryfikacja/${wybierzBledny()}`, cel: '[data-tour="blad"]',
    po: () => { const cb = $('#z-bledem'); if (cb && !cb.checked) cb.click(); } },
  { tytul: 'Akceptacja zależna od kwoty',
    tekst: 'Faktura do 10 000 zł trafia do kierownika działu, powyżej — także do dyrektora, powyżej 50 000 zł — jeszcze do finansów. Etapy idą po kolei, a kto weryfikował, ten nie akceptuje.',
    trasa: () => `akceptacja/${wybierzDoAkceptacji()}`, cel: '[data-tour="sciezka"]', przed: () => { tylkoMoje = false; } },
  { tytul: 'Akceptujący decyduje o błędzie',
    tekst: 'Tak kierownik widzi dokument oznaczony przez operatora. Może zatwierdzić mimo błędu, zwrócić do wyjaśnienia albo odrzucić — przy zwrocie i odrzuceniu komentarz jest obowiązkowy.',
    trasa: () => `akceptacja/${wybierzBlednyWAkceptacji()}`, cel: '[data-tour="blad-decyzja"]', przed: () => { tylkoMoje = false; } },
  { tytul: 'Wymaga wyjaśnienia',
    tekst: 'Zwrócony dokument wraca do operatora z komentarzem akceptującego. Wyjaśniasz sprawę, poprawiasz dane i zatwierdzasz w tym samym formularzu, wpisując, co ustalono. Akceptacja zaczyna się od nowa.',
    trasa: () => `weryfikacja/${wybierzDoWyjasnienia()}`, cel: '[data-tour="wyjasnienie"]' },
  { tytul: 'Archiwum z historią',
    tekst: 'Zaakceptowany dokument trafia do archiwum: nazwa pliku według wzoru, folder Rok/Miesiąc/Typ/Dział, plik tylko do odczytu i termin brakowania. Niżej pełna historia: kto, kiedy, co zmienił.',
    trasa: () => `archiwum/${wybierzZArchiwum()}`, cel: '[data-tour="archiwum-dane"]' },
  { tytul: 'Pulpit pilnuje terminów',
    tekst: 'Pulpit pokazuje, co czeka i gdzie są zatory, a alerty przypominają o fakturach, którym zaraz minie termin płatności. Teraz spróbuj sam. Samouczek odtworzysz przyciskiem u góry, a „Od nowa” przywraca stan początkowy.',
    trasa: 'pulpit', cel: '[data-tour="alerty"]' },
];

const naWeryfikacji = () => widoczne().filter(d => ['DO_WERYFIKACJI', 'WYMAGA_WYJASNIENIA'].includes(d.status));
function wybierzDoWeryfikacji() {
  const kolejka = widoczne().filter(d => d.status === 'DO_WERYFIKACJI');
  const d = kolejka.find(x => x.plik_oryginalny === 'dokument73.pdf') || wgPilnosci(kolejka)[0];
  return d ? d.numer_wplywu : '';
}
function wybierzBledny() {
  // faktura, w której netto + VAT ≠ brutto (z INBOX); inaczej dowolna czekająca na weryfikację
  const kolejka = widoczne().filter(d => d.status === 'DO_WERYFIKACJI');
  const d = kolejka.find(x => x.plik_oryginalny === 'scan7822.pdf') || kolejka.find(x => x.typ_proponowany === 'faktura') || kolejka[0];
  return d ? d.numer_wplywu : '';
}
function wybierzDoAkceptacji() {
  const lista = widoczne().filter(d => d.status === 'OCZEKUJE_NA_AKCEPTACJE');
  const d = lista.find(x => x.plik_oryginalny === 'IMG_5322.pdf') || lista.sort((a, b) => etapyAkceptacji(b).length - etapyAkceptacji(a).length)[0];
  return d ? d.numer_wplywu : '';
}
function wybierzBlednyWAkceptacji() {
  const d = widoczne().find(x => x.status === 'OCZEKUJE_NA_AKCEPTACJE' && x.blad);
  return d ? d.numer_wplywu : wybierzDoAkceptacji();
}
function wybierzDoWyjasnienia() {
  const d = naWeryfikacji().find(x => x.status === 'WYMAGA_WYJASNIENIA');
  return d ? d.numer_wplywu : '';
}
function wybierzZArchiwum() {
  const d = widoczne().find(x => x.plik_oryginalny === 'scan7142.pdf');
  if (d && d.status === 'ZARCHIWIZOWANY') return d.numer_wplywu;
  const inny = widoczne().find(x => x.status === 'ZARCHIWIZOWANY');
  return inny ? inny.numer_wplywu : '';
}

const samouczek = { krok: -1, el: null, cel: null, raf: 0 };

function startSamouczka() {
  if (samouczek.el) return;
  const el = document.createElement('div');
  el.className = 'samouczek';
  el.innerHTML = `
    <div class="sm-zaslona sm-g"></div><div class="sm-zaslona sm-d"></div><div class="sm-zaslona sm-l"></div><div class="sm-zaslona sm-p"></div>
    <div class="sm-okno" aria-hidden="true"></div>
    <div class="sm-dymek" role="dialog" aria-modal="true" aria-labelledby="sm-tytul">
      <div class="sm-gora"><span class="sm-licznik"></span><button class="sm-pomin" type="button">Pomiń</button></div>
      <h2 id="sm-tytul"></h2><p class="sm-tekst"></p>
      <div class="sm-dol"><div class="sm-kropki"></div>
        <div class="sm-przyciski"><button class="btn sm-wstecz" type="button">Wstecz</button><button class="btn glowny sm-dalej" type="button">Dalej</button></div></div>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('z-samouczkiem');
  samouczek.el = el;
  $('.sm-pomin', el).addEventListener('click', () => koniecSamouczka());
  $('.sm-wstecz', el).addEventListener('click', () => pokazKrok(samouczek.krok - 1));
  $('.sm-dalej', el).addEventListener('click', async () => {
    const k = KROKI[samouczek.krok];
    if (k.przyDalej) { $('.sm-dalej', el).disabled = true; await k.przyDalej(); $('.sm-dalej', el).disabled = false; }
    if (samouczek.krok >= KROKI.length - 1) koniecSamouczka(); else pokazKrok(samouczek.krok + 1);
  });
  window.addEventListener('resize', ustawOkno);
  window.addEventListener('scroll', ustawOkno, { passive: true });
  document.addEventListener('keydown', klawiszSamouczka);
  requestAnimationFrame(() => el.classList.add('widoczny'));
  pokazKrok(0);
}
function klawiszSamouczka(e) {
  if (e.key === 'Escape') koniecSamouczka();
}
function koniecSamouczka() {
  const el = samouczek.el;
  if (!el) return;
  try { localStorage.setItem(KLUCZ_SAMOUCZKA, '1'); } catch (e) { /* brak dostępu */ }
  el.classList.remove('widoczny');
  window.removeEventListener('resize', ustawOkno);
  window.removeEventListener('scroll', ustawOkno);
  document.removeEventListener('keydown', klawiszSamouczka);
  document.body.classList.remove('z-samouczkiem');
  samouczek.el = null; samouczek.cel = null; samouczek.krok = -1;
  setTimeout(() => el.remove(), 350);
}
function pokazKrok(i) {
  if (i < 0 || i >= KROKI.length) return;
  const k = KROKI[i];
  samouczek.krok = i;
  if (k.przed) k.przed();
  const cel = typeof k.trasa === 'function' ? k.trasa() : k.trasa;
  if (location.hash !== `#/${cel}`) { location.hash = `#/${cel}`; } else { render(); }
  const el = samouczek.el;
  const dymek = $('.sm-dymek', el);
  dymek.classList.remove('wejscie');
  void dymek.offsetWidth;
  dymek.classList.add('wejscie');
  $('.sm-licznik', el).textContent = `${i + 1} / ${KROKI.length}`;
  $('#sm-tytul', el).textContent = k.tytul;
  $('.sm-tekst', el).textContent = typeof k.tekst === 'function' ? k.tekst() : k.tekst;
  $('.sm-kropki', el).innerHTML = KROKI.map((_, j) => `<span class="${j === i ? 'aktywna' : j < i ? 'zrobiona' : ''}"></span>`).join('');
  $('.sm-wstecz', el).style.visibility = i === 0 ? 'hidden' : 'visible';
  $('.sm-dalej', el).textContent = i === KROKI.length - 1 ? 'Zaczynam' : i === 0 ? 'Pokaż' : 'Dalej';
  // poczekaj, aż widok się przerysuje po zmianie trasy
  setTimeout(() => {
    if (k.po) k.po();
    samouczek.cel = k.cel ? $(k.cel) : null;
    if (samouczek.cel) {
      const mobilny = window.innerWidth < 720;
      const r = samouczek.cel.getBoundingClientRect();
      const y = window.scrollY + r.top - (mobilny ? 72 : Math.max(80, (window.innerHeight - Math.min(r.height, window.innerHeight * 0.6)) / 2 - 60));
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    ustawOkno();
    setTimeout(ustawOkno, 400);
    setTimeout(ustawOkno, 800);
  }, 60);
}
function ustawOkno() {
  cancelAnimationFrame(samouczek.raf);
  samouczek.raf = requestAnimationFrame(() => {
    const el = samouczek.el;
    if (!el) return;
    const okno = $('.sm-okno', el), dymek = $('.sm-dymek', el);
    const W = window.innerWidth, H = window.innerHeight;
    const mobilny = W < 720;
    let r = null;
    if (samouczek.cel && samouczek.cel.isConnected) {
      const b = samouczek.cel.getBoundingClientRect();
      const m = 8;
      const top = Math.max(b.top - m, 4), left = Math.max(b.left - m, 4);
      const bottom = Math.min(b.bottom + m, H - 4), right = Math.min(b.right + m, W - 4);
      if (bottom > top + 10 && right > left + 10) r = { top, left, width: right - left, height: bottom - top };
    }
    const [g, d, l, p] = ['.sm-g', '.sm-d', '.sm-l', '.sm-p'].map(s => $(s, el));
    if (r) {
      el.classList.add('z-celem');
      Object.assign(okno.style, { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` });
      Object.assign(g.style, { top: 0, left: 0, width: '100%', height: `${r.top}px` });
      Object.assign(d.style, { top: `${r.top + r.height}px`, left: 0, width: '100%', height: `${Math.max(0, H - r.top - r.height)}px` });
      Object.assign(l.style, { top: `${r.top}px`, left: 0, width: `${r.left}px`, height: `${r.height}px` });
      Object.assign(p.style, { top: `${r.top}px`, left: `${r.left + r.width}px`, width: `${Math.max(0, W - r.left - r.width)}px`, height: `${r.height}px` });
    } else {
      el.classList.remove('z-celem');
      Object.assign(okno.style, { top: `${H / 2}px`, left: `${W / 2}px`, width: '0px', height: '0px' });
      Object.assign(g.style, { top: 0, left: 0, width: '100%', height: '100%' });
      [d, l, p].forEach(x => Object.assign(x.style, { width: 0, height: 0 }));
    }
    // dymek: na telefonie przyklejony do dołu, na komputerze obok podświetlenia
    if (mobilny) {
      dymek.style.cssText = '';
      dymek.classList.add('dol');
      return;
    }
    dymek.classList.remove('dol');
    const dw = dymek.offsetWidth, dh = dymek.offsetHeight;
    let top, left;
    if (!r) { top = (H - dh) / 2; left = (W - dw) / 2; }
    else if (r.top + r.height + 16 + dh < H) { top = r.top + r.height + 16; left = r.left; }
    else if (r.top - 16 - dh > 0) { top = r.top - 16 - dh; left = r.left; }
    else if (r.left + r.width + 16 + dw < W) { top = Math.min(Math.max(16, r.top), H - dh - 16); left = r.left + r.width + 16; }
    else if (r.left - 16 - dw > 0) { top = Math.min(Math.max(16, r.top), H - dh - 16); left = r.left - 16 - dw; }
    else { top = H - dh - 24; left = (W - dw) / 2; }
    left = Math.min(Math.max(16, left), W - dw - 16);
    dymek.style.top = `${top}px`;
    dymek.style.left = `${left}px`;
  });
}

// ------------------------------------------------------------------ start

async function start() {
  const pasek = () => document.documentElement.style.setProperty('--wys-paska', `${$('.topbar').offsetHeight}px`);
  pasek();
  window.addEventListener('resize', pasek);
  const zapisany = wczytajZapisany();
  try {
    if (zapisany) { S = zapisany.S; ja = PO_LOGINIE[zapisany.ja] ? zapisany.ja : 'operator'; }
    else S = await stanPoczatkowy();
  } catch (e) {
    $('#widok').innerHTML = '<div class="komunikat blad">Nie udało się wczytać danych demo. Odśwież stronę.</div>';
    return;
  }
  const rola = $('#rola');
  rola.innerHTML = UZYTKOWNICY.map(u => `<option value="${u.login}">${esc(opisUzytkownika(u))}</option>`).join('');
  rola.value = ja;
  rola.addEventListener('change', () => { ustawRole(rola.value); render(); toast(`Działasz jako: ${opisUzytkownika(PO_LOGINIE[ja])}`, 'info'); });
  $('#btn-samouczek').addEventListener('click', startSamouczka);
  $('#btn-reset').addEventListener('click', async () => {
    if (!confirm('Przywrócić stan początkowy demo? Twoje zmiany zostaną usunięte.')) return;
    S = await stanPoczatkowy();
    ustawRole('operator');
    przyjmowanie = false;
    Object.assign(filtry, { typ: '', status: 'ZARCHIWIZOWANY', kontrahent: '', numer: '', fraza: '' });
    zapisz();
    if (location.hash !== '#/pulpit') location.hash = '#/pulpit'; else render();
    toast('Przywrócono stan początkowy.', 'info');
  });
  window.addEventListener('hashchange', () => { render(); if (!samouczek.el) window.scrollTo(0, 0); });
  render();
  let widzial = false;
  try { widzial = localStorage.getItem(KLUCZ_SAMOUCZKA) === '1'; } catch (e) { /* brak dostępu */ }
  if (!widzial && !new URLSearchParams(location.search).has('bez-samouczka')) setTimeout(startSamouczka, 450);
}

start();
