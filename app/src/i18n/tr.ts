// The Turkish text of the UI: the same shape as `en.ts` (a missing or extra key fails the build), worded the way the
// Turkish edition of Football Manager words things. The comments in `en.ts` say what each string is for.
//
// Turkish has no plural after a number ("3 değişiklik"), and its case endings follow the word they end, not a
// number, so the sentences are built to put an ending on a noun ("oyuncunun"), never on a figure.

import type {
  Concern,
  EditEntity,
  Entity,
  MassOperationKind,
  MassPreview,
  OpportunityKind,
  PlayerSort,
  SquadSort,
  Storefront,
} from "../types";
import type { ErrorTexts, Strings } from "./en";
import { fieldName } from "./fieldNames";
import { reasonText } from "./reasons";
import { placeNameTR, REASONS_TR } from "./reasons/tr";

const numbers = new Intl.NumberFormat("tr-TR");
const percents = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

/** A count or an amount with the thousands separators of the language: "12.345". */
const format = (value: number) => numbers.format(value);

/** "3 değişiklik", "12.345 değişiklik". */
const changes = (count: number) => `${format(count)} değişiklik`;

/** For the places that say how many changes there are, which may be none: "Değişiklik yok", "3 değişiklik". */
const changeCount = (count: number) => (count === 0 ? "Değişiklik yok" : changes(count));

/** "12 değere dokunulmadı": the ending is on the noun, so the same words do for one and for many. */
const valuesLeftAlone = (count: number) => `${format(count)} değere dokunulmadı`;

/** What each list holds, as the sentences need it: the noun itself, "of the" (genitive) and "in" (locative). */
const nouns: Record<Entity, { plain: string; of: string; in: string }> = {
  player: { plain: "oyuncu", of: "oyuncunun", in: "oyuncuda" },
  staff: { plain: "personel", of: "personelin", in: "personelde" },
  club: { plain: "kulüp", of: "kulübün", in: "kulüpte" },
};

/** "237 oyuncu", "1 personel", "12 kulüp". */
const entityCount = (entity: Entity, count: number) => `${format(count)} ${nouns[entity].plain}`;

const SQUAD_STATUSES: Partial<Record<number, string>> = {
  1: "Yıldız oyuncu",
  2: "Önemli oyuncu",
  3: "Düzenli ilk 11 oyuncusu",
  4: "Rotasyon oyuncusu",
  5: "Etkili yedek",
  7: "Kenarda kalan oyuncu",
  9: "Acil durum yedeği",
  10: "A takıma yükselmeye yakın genç",
  11: "Geleceğin yeteneği",
  13: "Genç oyuncu",
  14: "B takımının düzenli oyuncusu",
  15: "Birinci kaleci",
  16: "Kupa kalecisi",
  17: "Yerel kupa kalecisi",
  20: "Yedek kaleci",
  21: "Acil durum yedek kalecisi",
  22: "İhtiyaç fazlası",
};

/** The kinds of contract (see `en.ts`). */
const CONTRACT_TYPES: Partial<Record<number, string>> = {
  0: "Yarı zamanlı sözleşme",
  1: "Tam zamanlı sözleşme",
  2: "Amatör sözleşme",
  3: "Genç oyuncu sözleşmesi",
  4: "Sözleşmesiz",
  8: "A takım sözleşmesi",
  10: "Asgari ücretli A takım sözleşmesi",
  11: "A takım sözleşmesi",
};

/** The name of the field a failure names. The sentences put no ending on it: "için" and a colon need none. */
const field = (key: string | undefined) => fieldName(tr, key ?? "");

/** A day the commands name as "20280131", written out in the language's own way. */
const dayText = (value: string | undefined) => {
  const [y, m, d] = [Number(value?.slice(0, 4)), Number(value?.slice(4, 6)), Number(value?.slice(6, 8))];
  return new Date(y, m - 1, d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
};

/** The noun of the kind of record a failure names, or "kayıt" when it names none. */
const recordNoun = (entity: string | undefined) =>
  entity === "player" || entity === "staff" || entity === "club" ? nouns[entity].plain : "kayıt";

/** The reasons the Rust side gives for a field that cannot be changed some way. */
const UNSUPPORTED: Partial<Record<string, string>> = {
  "a date can only be set or moved by years":
    "bir tarih yalnızca doğrudan ayarlanabilir ya da yıl eklenerek kaydırılabilir",
  "only a date can be moved by years": "yalnızca bir tarihe yıl eklenebilir",
  "it is changed one person at a time": "bu alan kişi kişi değiştirilir",
  "the new value is not one of the game's own records of that kind":
    "yeni değer, oyunun bu türdeki kendi kayıtlarından biri değil",
  "the in-game date is not known": "oyun içi tarih bilinmiyor",
};

const reload = "verileri yeniden okuyup tekrar deneyin";

/** The departments of a club's staff, as `staff.noRoom` names them. */
const STAFF_DEPARTMENTS: Partial<Record<string, string>> = {
  medical: "sağlık ekibi",
  coaching: "antrenör",
  scouting: "gözlemci",
};

/** What a check is about, from the key a failure gives, with a capital. */
const checkName = (key: string | undefined) => {
  const name = (tr.checks as Partial<Record<string, string>>)[key ?? ""] ?? key ?? "";
  return name.charAt(0).toLocaleUpperCase("tr") + name.slice(1);
};

/** The name of a job code a failure gives, as `jobs` below has it. */
const jobName = (code: string | undefined) => (tr.jobs as Partial<Record<number, string>>)[Number(code)] ?? code;

const errors: ErrorTexts = {
  "team.nobodyInjured": () => "Bu takımda sakat oyuncu yok.",
  "team.noCohesion": () =>
    "Editör bu takımın uyumunu okuyamıyor: oyunun bu sürümü bunun için kontrol edilmedi ya da oyuncuların hiçbirinin " +
    "kulüple uyumu yok.",
  "team.noTactics": () =>
    "Editör bu takımın taktiğini ne kadar bildiğini okuyamıyor: oyunun bu sürümü bunun için kontrol edilmedi ya da " +
    "takım senin seçtiğin bir taktiği oynamıyor.",
  "edit.unknownField": (p) => `Burada “${p.field}” adında düzenlenebilir bir alan yok.`,
  "edit.outOfRange": (p) => `${field(p.field)} için ${p.value} geçersiz: ${p.min} ile ${p.max} arasında olmalı.`,
  "edit.notADate": (p) => `${p.value}, ${field(p.field)} için geçerli bir tarih değil.`,
  "edit.notAChoice": (p) => `${p.value}, ${field(p.field)} için seçilebilecek değerlerden biri değil.`,
  "edit.taken": (p) => `${p.value} numaralı formayı takımda ${p.name ?? `${p.uid} kimlikli oyuncu`} giyiyor.`,
  "edit.unsupported": (p) => `${field(p.field)} bu şekilde değiştirilemez: ${UNSUPPORTED[p.reason] ?? p.reason}.`,
  "edit.moved": (p) => `Bu ${recordNoun(p.entity)} oyunun belleğinde yer değiştirmiş; ${reload}.`,
  "edit.noRecord": (p) => `${field(p.field)} burada değiştirilemez: kaydı yok ya da doğrulanamadı.`,
  "edit.unset": (p) => `${field(p.field)} oyunda ayarlanmamış, bu yüzden dokunulmadı.`,
  "edit.implausible": (p) =>
    `${field(p.field)} şu an ${p.value} okunuyor ve bu alan böyle bir değer alamaz; güvenlik için dokunulmadı.`,
  "edit.notApplied": (p) => `${field(p.field)}: ${p.wrote} yazıldı ama geri ${p.read} okundu.`,
  "edit.conflict": (p) => `${field(p.field)} şu an ${p.found}, ${p.expected} değil: oyun o zamandan beri değiştirmiş.`,
  "move.moved": () => `Oyuncu oyunun belleğinde yer değiştirmiş; ${reload}.`,
  "move.notAClub": () => "Bu kulübün oyuncunun katılabileceği bir A takımı yok.",
  "move.freeAgent": () => "Oyuncu serbest: ayrılacağı ya da takas edileceği bir kulübü yok.",
  "move.sameClub": () => "Oyuncu zaten bu kulüpte.",
  "move.onLoan": () =>
    "Oyuncu kiralık: önce profilindeki Kiralık bölümünden geri çağırın ya da kiralığı kalıcı yapın.",
  "move.notOnLoan": () => "Oyuncu kiralık değil.",
  "move.playerCoach": () => "Oyuncu-antrenörler taşınamıyor: aynı zamanda personel olarak da çalışıyorlar.",
  "move.unusualContract": () => "Oyuncunun sözleşmesi olağan bir oyuncu sözleşmesi değil.",
  "move.humanClub": () =>
    "Oyuncu, bir insan menajerin yönettiği kulüpte. Editör oyunun bu sürümünde o kulübün ilk 11 ve yedek " +
    "seçimlerini henüz bulamıyor; bu yüzden kulüpten ancak oyunun içinden ayrılabilir.",
  "move.menAndWomen": () => "Kulüplerden biri erkek, diğeri kadın kulübü.",
  "move.notListed": () => "Kadro listeleri oyuncuyu olması gereken yerde tutmuyor.",
  "move.noRoom": (p) =>
    `Kulübün kadro listesinde bir oyuncuya daha yer yok (şu an ${p.players} oyuncu) ve düzenleyici bu sistemde listeyi büyütemez.`,
  "sign.noPool": () =>
    "Düzenleyici, oyunun bu sürümünde sözleşmeleri nerede tuttuğunu bulamıyor; bu yüzden serbest oyuncuya sözleşme veremiyor.",
  "sign.poolFull": () =>
    "Oyunun başka bir sözleşmeye yeri yok; yer, oyun günler geçtikçe kendi sözleşmelerini yaptıkça açılır. Oyunda bir gün ilerleyip tekrar deneyin.",
  "arrange.unknown": () => "Düzenleyici, oyunun bu sürümünde transferlerin nerede tutulduğunu bulamıyor.",
  "arrange.underWay": () => "Oyuncunun anlaşılmış bir transferi ya da henüz yanıtlanmamış bir teklifi var.",
  "arrange.noMemory": () =>
    "Düzenleyici bunun için oyunda bellek alamadı: Sistem, oyunun kendi işlevlerini düzenleyici için çalıştırmasına izin vermedi.",
  "arrange.made": () =>
    "Oyun bu transferi zaten yaptı ya da ayarlanırken yazılanları değiştirdi: geri alınamaz.",
  "sign.noModel": () =>
    "Kulübün A takımında yeni sözleşmeye örnek alınacak, olağan sözleşmeli bir oyuncu yok.",
  "sign.noDate": () => "Düzenleyici oyun içi tarihi okuyamıyor; yeni sözleşme o tarihte başlar.",
  "loan.end": (p) => `Kiralık, oyuncu katıldıktan sonra ve sözleşmesinden geç olmayacak şekilde bitmeli: ${dayText(p.earliest)} ile ${dayText(p.latest)} arası.`,
  "loan.noModel": () => "Oyunun bunu örnek alacağı, süren kendi kiralığı yok; oyunda bir gün geçince yeniden deneyin.",
  "move.outOfRange": (p) => `${field(p.field)} için ${p.value} geçersiz: ${p.min} ile ${p.max} arasında olmalı.`,
  "move.changed": () => `Oyun bu belleği o zamandan beri değiştirmiş; ${reload}.`,
  "move.notApplied": () => "Belleğe yazıldı ama geri okunan farklı çıktı.",
  "heal.notInjured": () => "Oyuncunun iyileştirilecek bir sakatlığı yok.",
  "ban.notBanned": () => "Oyuncunun kaldırılacak bir cezası yok.",
  "retirement.unknown": () => "Düzenleyici, oyunun bu sürümünde planlanan emeklilikleri bulamıyor.",
  "guard.unknownBuild": () =>
    "FMLibreEditor oyunun bu sürümüyle denenmedi, bu yüzden ona yazmıyor. Üstteki uyarıdaki “Yine de düzenle” " +
    "düzenlemeyi açar.",
  "guard.failed": (p) =>
    `${checkName(p.check)} oyunun bu sürümünde denetimden geçmedi, bu yüzden FMLibreEditor onları değiştirmiyor.`,
  "guard.saveChanged": () =>
    "FMLibreEditor oyunu okuduktan sonra oyun bir kayıt yükledi ya da ana menüye döndü, bu yüzden “Verileri yeniden " +
    "oku”ya basana kadar hiçbir şeyi değiştirmiyor.",
  "retirement.none": () => "Oyun bu oyuncunun emekliliğini planlamamış ve oyuncu zaten oynamaya devam etmek istiyor.",
  "clause.noContract": () => "Oyuncunun sözleşmesi yok.",
  "clause.missing": () => `Sözleşmede bu madde artık yok; ${reload}.`,
  "clause.notInClause": (p) => `Bu maddenin değiştirilecek bir ${p.field === "clause.amount" ? "tutarı" : "koşulu"} yok.`,
  "clause.same": () => "Sözleşmede bu zaten var.",
  "clause.noRoom": () =>
    "Sözleşmenin madde listesinde yer yok ve düzenleyici listeyi büyütemiyor; bunun yerine bir maddeyi değiştirin.",
  "relation.missing": () => `Oyuncunun listesinde bu uyruk ya da yetiştiği yer artık yok; ${reload}.`,
  "relation.noRoom": () =>
    "Oyuncunun listesinde yer yok ve düzenleyici listeyi büyütemiyor; bunun yerine kayıtlardan birini değiştirin.",
  "relation.target": () => "Bu, bu kaydın alabileceği türde oyundaki bir ülke ya da kulüp değil.",
  "relation.same": () => "Oyuncuda bu zaten var.",
  "relation.rule": (p) => `${p.rule} numaralı yerli kuralı, düzenleyicinin yazdığı kurallardan değil.`,
  "staff.you": () => "Bu sizsiniz, yönettiğiniz teknik direktör.",
  "staff.unemployed": () => "Bu personelin bir kulübü yok.",
  "staff.role": () =>
    "Kulüp ya da takımlarından biri bu personele doğrudan işaret ediyor (futbol direktörlüğünü de yapan bir teknik " +
    "direktör ya da takımı çalıştıran bir başkan gibi); onu oyun kendisi taşır.",
  "staff.notListed": () => "Kulübün personel listeleri onu olması gereken yerde tutmuyor.",
  "staff.noRoom": (p) =>
    `Kulübün ${STAFF_DEPARTMENTS[p.department] ?? p.department} listesinde bir kişiye daha yer yok (şu an ${p.staff}) ve düzenleyici bu sistemde listeyi büyütemez.`,
  "names.unknown": () =>
    "Editör, oyunun bu sürümünde kişilerin adlarını nerede tuttuğunu bulamıyor; bu yüzden onları değiştiremiyor.",
  "names.noRoom": (p) =>
    `Oyunda şu an yeni bir ${({ first: "ad", last: "soyad", common: "bilinen ad" } as Record<string, string>)[p.table] ?? "ad"} için yer yok. ` +
    "Yeni oyuncular ve personel geldikçe oyun kendisi yer açar; ya da oyunu kaydedin, kaydı yeniden yükleyin ve tekrar deneyin.",
  "names.same": () => "Ad zaten bu.",
  "names.bad": (p) =>
    `Ad ya da soyad boş olamaz; hiçbir ad boşlukla başlayıp bitemez, denetim karakteri içeremez ve ${p.max} bayttan uzun olamaz.`,
  "stadium.none": () => "Kulübün A takımının oynadığı stadyum okunamıyor.",
  "stadium.shared": (p) => `Bu adı oyunda ${p.holders} şey paylaşıyor; yalnızca bu stadyum için değiştirilemez.`,
  "stadium.nameLength": (p) =>
    `Bu stadyumun yeni adı, oyunun adı tuttuğu yere sığmak için ${p.min} ile ${p.max} bayt arası olmalı; bu ad ${p.bytes} bayt.`,
  "stadium.badName": () => "Stadyum adı boş olamaz, boşlukla başlayıp bitemez ve denetim karakteri içeremez.",
  "staff.job": (p) => `Düzenleyici, görevi ${jobName(p.job)} olan personeli henüz taşıyamıyor ve bu görevi veremiyor.`,
  "staff.directorTaken": (p) =>
    `Kulübün zaten bir futbol direktörü var: ${p.name ?? "başka biri"}. Bu personele orada başka bir görev verin ya ` +
    "da önce mevcut futbol direktörünü başka bir yere taşıyın.",
  "staff.managerTaken": (p) =>
    `Kulübün zaten bir teknik direktörü var: ${p.name ?? "başka biri"}. Bu personele orada başka bir görev verin ya ` +
    "da önce mevcut teknik direktörü başka bir yere taşıyın.",
  "staff.yourClub": () =>
    "Bu kulübü siz yönetiyorsunuz. Bu personele orada başka bir görev verin: FMLibreEditor sizin yerinizi hiçbir " +
    "zaman almaz.",
  "staff.noJob": () => "Kulüpte alacağı görevi seçin.",
  "staff.noModel": (p) =>
    p.staff === "0"
      ? "Bu kulübün hiç personeli yok: oyun, bu kayıtta oynanabilir olmayan liglerdeki kulüplerde personel tutmuyor."
      : "Bu kulübün personelinden hiçbirinin, yeni sözleşmeye örnek alınacak kendi tam sözleşmesi yok.",
  "squad.noTeam": () => `Kulübün böyle bir takımı yok ya da takım doğrulanamadı; ${reload}.`,
  "captain.notInTeam": () => "Oyuncu bu takımda oynamıyor; kaptan ancak takımın kendi oyuncularından seçilebilir.",
  "captain.unchanged": () => "Oyuncu bu görevi zaten üstleniyor.",
  "session.notRunning": () => "Football Manager 27 çalışmıyor. Oyunu başlatıp bir kayıt yükleyin, sonra tekrar deneyin.",
  "session.noSuchProcess": (p) => `${p.pid} işlem numaralı bir ${p.exe ?? "fm.exe"} yok.`,
  "session.severalRunning": (p) => `${p.exe ?? "fm.exe"} için ${p.count} kopya çalışıyor (${p.pids}); birini seçin.`,
  "session.pluginNotLoaded": () => "Oyunun verisi henüz yüklenmedi; ana menüyü bekleyip tekrar deneyin.",
  "session.unsupportedEdition": (p) => `FM${p.edition} henüz desteklenmiyor.`,
  "session.unknownEdition": () => "Bunun hangi Football Manager olduğu anlaşılamadı.",
  "session.playersNotFound": () => "Oyuncu listesi bulunamadı; bir kayıt yükleyin (ana menü yetmez) ve tekrar deneyin.",
  "memory.win32": (p) => `Windows bir işlemi reddetti (${p.operation}, hata ${p.code}).`,
  "memory.read": (p) => `Oyunun belleği okunamadı (sistem hatası ${p.code}).`,
  "memory.write": (p) => `Oyunun belleğine yazılamadı (sistem hatası ${p.code}).`,
  "memory.readOnly": () => "Oyun yalnızca okunmak üzere açıldı; Windows yazmaya izin vermedi.",
  "memory.notWritable": () => "Bu adres oyunun yazılabilir veri belleğinde değil, bu yüzden yazılmadı.",
  "memory.invalidPe": () => "Oyunun modülü okunamadı.",
  "memory.invalidMachO": () => "Oyunun modülü okunamadı.",
  "memory.mach": (p) => `macOS bir işlemi reddetti (${p.operation}, hata ${p.code}).`,
  "memory.posix": (p) => `macOS bir işlemi reddetti (${p.operation}, errno ${p.code}).`,
  "memory.noBridge": () =>
    "macOS, FMLibreEditor'ın oyuna girmesine izin vermiyor: oyun, FMLibreEditor köprüsü olmadan başlatılmış. " +
    "Köprüyü kurun, ardından oyunu Steam'den yeniden başlatın.",
  "memory.bridge": (p) => `Oyundaki FMLibreEditor köprüsü belleği vermedi (${p.reason}).`,
  "scout.noClub": () => "Bu kayıtta bir kulüp çalıştırmıyorsunuz, bu yüzden gözlem yapılacak kimse yok.",
  "scout.noTactic": (p) => `${p.club} kulübünün taktiği oyundan okunamadı.`,
  "scout.notPlaced": () => "Oyuncu taktiğin hiçbir pozisyonunda değil.",
  "scout.unknownRole": (p) => `Editör ${p.role} rolünü tanımıyor.`,
  "setup.steamRunning": () =>
    "Steam açık olduğu için FM27'nin başlatma seçeneklerine dokunulmadı; köprünün kendisi kuruldu. Steam'den çıkıp " +
    "yeniden deneyin ya da başlatma seçeneğini Steam'de kendiniz girin.",
  "setup.noSteamAccount": () => "Bu Mac'te bir Steam hesabı bulunamadı; Steam'i bir kez açıp giriş yapın.",
  "setup.noLibrary": (p) => `Köprü kütüphanesi uygulamada eksik: ${p.path}`,
  "setup.unknownConfig": (p) => `${p.path} FMLibreEditor'ın tanıdığı biçimde değil, bu yüzden dokunulmadı.`,
  "setup.io": (p) => `${p.path}: ${p.error}`,
  "app.internal": () => "Uygulamada beklenmeyen bir hata oluştu.",
  "app.notConnected": () => "Oyuna bağlı değil.",
  "app.notFound": (p) => `Listelerde ${p.uid} kimlikli bir ${recordNoun(p.entity)} yok; verileri yeniden okuyun.`,
  "app.dataChanged": () => `Bu veriler oyunda değişti; ${reload}.`,
  "app.noChange": (p) => `${p.id} numaralı bir değişiklik yok.`,
  "app.alreadyUndone": () => "Bu değişiklik zaten geri alındı.",
  "app.historyOnly": () => "Bu değişiklik uygulama son bağlandığından önce yapıldı ve geri almak için oyunun belleğinin o anki hâli gerekiyordu: elle geri değiştir.",
  "app.history": (p) => `Geçmiş temizlenemedi: ${p.reason}`,
  "export.failed": (p) => `Dosya yazılamadı: ${p.reason}`,
  "export.notAllowed": (p) =>
    `FMLibreEditor ${p.folder} klasörüne yazamıyor. macOS, Belgeler klasörünü kullanıp kullanamayacağını sorduysa ` +
    "Sistem Ayarları › Gizlilik ve Güvenlik › Dosyalar ve Klasörler'den izin verin, sonra yeniden dışa aktarın.",
  "export.noFolder": () => "Dışa aktarılacak bir klasör yok.",
  "export.notExported": () => "Bu, FMLibreEditor'ün dışa aktardığı bir dosya değil.",
  "export.openFailed": (p) => `Açılamadı: ${p.reason}`,
  "mass.noOperations": () => "Değiştirilecek en az bir alan seçin.",
  "mass.tooMany": (p) =>
    `${p.count} sonuç var. Toplu düzenleme için aramayı ya da filtreleri en fazla ${p.limit} sonuca daraltın.`,
  "recipe.tooOld": (p) => `Oyuncu ${p.age} yaşında: bu tarif ${p.oldest} yaş ve altındaki oyuncular için.`,
  "recipe.ageUnknown": () => "Oyuncunun yaşı bilinmiyor; bu tarif yaşa göre çalışır.",
  "recipe.outOfDate": () => "Bu önizleme eskidi. Tarifi yeniden açın.",
  "mass.outOfDate": () => "Bu önizleme eskidi. Toplu düzenlemeyi yeniden önizleyin.",
};

const TRAIT_NAMES_TR: readonly string[] = [
  "Topla sol kanattan ilerler",
  "Topla sağ kanattan ilerler",
  "Topla merkezden ilerler",
  "Rakip ceza sahasına girer",
  "Boşluklara koşar",
  "Fırsat buldukça ileri çıkar",
  "Kısa ve basit paslar atar",
  "Sık sık öldürücü pas dener",
  "Uzaktan şut çeker",
  "Sert şut çeker",
  "Plase vuruş yapar",
  "Topa falso verir",
  "Kaleciyi çalımlamayı sever",
  "Ofsayt tuzağını bozmaya çalışır",
  "Dış ayakla vurur",
  "Rakibini sıkı markaja alır",
  "Rakibini kışkırtır",
  "Hakemlerle tartışır",
  "Sırtı dönük oynar",
  "Topu almak için geriye gelir",
  "Ver-kaç oynar",
  "Kaleciye aşırtma yapmayı sever",
  "Oyunun temposunu belirler",
  "Rövaşata dener",
  "Şut yerine pas arar",
  "Ara pası atmaz",
  "Oyunu durdurur",
  "Topu rakibin yanından geçirir",
  "Çalımdan önce topu sağ ayağına alır",
  "Çalımdan önce topu sol ayağına alır",
  "Topu fazla tutar",
  "Ceza sahasına geç girer",
  "Sıkışınca oynayarak çıkmaya çalışır",
  "Her zaman geride kalır",
  "Zayıf ayağını kullanmaktan kaçınır",
  "Çalım numaraları dener",
  "Uzak mesafeden serbest vuruş dener",
  "Kayarak müdahale eder",
  "Kayarak müdahaleye girmez",
  "İçeri kat eder",
  "Çizgiye yakın oynar",
  "Taraftarı coşturur",
  "Gelişine şut dener",
  "Uzun paslar dener",
  "Topun ayağına gelmesini sever",
  "Serbest vuruşları sert kullanır",
  "Rakibini tekrar tekrar çalımlamayı sever",
  "Topu diğer kanada aktarmayı sever",
  "Zirvedeyken emekli olur",
  "Olabildiğince uzun futbol oynar",
  "Uzun ve düz taç atar",
  "Topla sık koşar",
  "Topla nadiren koşar",
  "Zayıf ayağını geliştirmeye çalışır",
  "Sabit hedef santrfor",
  "Kontra atak için uzun taç kullanır",
  "Uzaktan şut çekmekten kaçınır",
  "Sol kanattan içeri kat eder",
  "Sağ kanattan içeri kat eder",
  "Erken orta yapar",
  "Topu savunmadan çıkarır",
  "Topu ayaklarıyla oynar"
];

const CLAUSE_NAMES_TR: Partial<Record<number, string>> = {
  0: "Serbest kalma maddesi",
  1: "Küme düşmede serbest kalma maddesi",
  2: "Üst lige çıkamazsa serbest kalma maddesi",
  3: "Yıllık maaş artışı",
  4: "Üst lige çıkışta maaş artışı",
  5: "Küme düşmede maaş indirimi",
  6: "Teknik ekip görevi için serbest kalma maddesi",
  8: "Sonraki satıştan pay yüzdesi",
  9: "Sonraki satış kârından pay yüzdesi",
  10: "Sezonluk gol hedefi primi",
  11: "Lig maçı sayısına ulaşınca bir yıl uzatma (son sezon)",
  12: "En yüksek maaşa eşitleme maddesi",
  13: "Lig maçı sayısına ulaşınca maaş",
  14: "En üst lige çıkışta maaş artışı",
  15: "Üst ligden düşmede maaş indirimi",
  16: "Serbest kalma maddesi (yabancı kulüpler)",
  17: "Serbest kalma maddesi (üst ligdeki yerli kulüpler)",
  18: "Serbest kalma maddesi (yerli kulüpler)",
  19: "Milli maç sayısına ulaşınca maaş",
  20: "Maaşın sponsorca ödenen yüzdesi",
  21: "Bilet gelirinden oyuncuya ödenen yüzde",
  22: "Kulübün tek taraflı uzatma opsiyonu",
  23: "Teknik direktörlük için kulüp tazminatından feragat",
  25: "Lig maçı sayısına ulaşınca bir yıl uzatma (üst lige çıkılan son sezon)",
  26: "Lig maçı sayısına ulaşınca bir yıl uzatma (küme düşülmeyen son sezon)",
  27: "Serbest kalma maddesi (UEFA Şampiyonlar Ligi'ndeki kulüpler)",
  28: "MLS garantili sözleşme maddesi",
  29: "Üst lige çıkışta sözleşme uzatma",
  30: "Sakatlıkta serbest kalma maddesi",
  31: "Serbest kalma maddesi (kıtasal kupadaki kulüpler)",
  32: "Maç başına ücret",
  33: "Gol primi",
  34: "Gol yememe primi",
  37: "Milli maç primi",
  38: "Oynamayan yedek ücreti",
  39: "Asist primi",
  40: "Sezonluk asist hedefi primi",
  41: "Sezonluk gol ve asist hedefi primi",
  54: "Oyunda gösterilmiyor (54)",
  55: "Etkin küme düşme serbest kalma maddesi",
  56: "Etkin üst lige çıkamama serbest kalma maddesi",
  58: "Oyunda gösterilmiyor (58)",
  63: "Oyunda gösterilmiyor (63)",
};

export const tr: Strings = {
  attributes: {
    // Teknik
    corners: "Korner",
    crossing: "Orta",
    dribbling: "Top Sürme",
    finishing: "Bitiricilik",
    first_touch: "İlk Kontrol",
    free_kicks: "Serbest Vuruş",
    heading: "Kafa Vuruşu",
    long_shots: "Uzaktan Şut",
    long_throws: "Uzun Taç",
    marking: "Markaj",
    passing: "Pas",
    penalty_taking: "Penaltı Kullanma",
    tackling: "Top Kapma",
    technique: "Teknik",
    // Zihinsel
    aggression: "Agresiflik",
    anticipation: "Önsezi",
    bravery: "Cesaret",
    composure: "Soğukkanlılık",
    concentration: "Konsantrasyon",
    decisions: "Karar Alma",
    determination: "Kararlılık",
    flair: "Yaratıcılık",
    leadership: "Liderlik",
    off_the_ball: "Topsuz Alan",
    positioning: "Pozisyon Alma",
    teamwork: "Takım Oyunu",
    vision: "Vizyon",
    work_rate: "Çalışkanlık",
    // Fiziksel
    acceleration: "Hızlanma",
    agility: "Çeviklik",
    balance: "Denge",
    jumping_reach: "Zıplama",
    natural_fitness: "Doğal Kondisyon",
    pace: "Hız",
    stamina: "Dayanıklılık",
    strength: "Güç",
    // Kalecilik (ilk kontrol ve pas Teknik ile ortaktır)
    aerial_reach: "Hava Hakimiyeti",
    command_of_area: "Alan Hakimiyeti",
    communication: "İletişim",
    eccentricity: "Eksantriklik",
    handling: "Top Tutma",
    kicking: "Vuruş",
    one_on_ones: "Bire Bir",
    punching: "Yumrukla Uzaklaştırma (Eğilim)",
    reflexes: "Refleksler",
    rushing_out: "Kaleyi Terk Etme (Eğilim)",
    throwing: "Atış",
    // Gizli
    consistency: "İstikrar",
    dirtiness: "Sertlik",
    important_matches: "Büyük Maçlar",
    injury_proneness: "Sakatlık Eğilimi",
    versatility: "Çok Yönlülük",
    // Ayaklar
    left_foot: "Sol Ayak",
    right_foot: "Sağ Ayak",
  },

  staffAttributes: {
    // Antrenörlük
    attacking: "Hücum",
    defending: "Savunma",
    fitness: "Kondisyon",
    goalkeeping: "Kalecilik",
    possession: "Top Kontrolü",
    set_pieces: "Duran Toplar",
    tactical: "Taktik",
    technical: "Teknik",
    working_with_youngsters: "Gençlerle Çalışma",
    // Zihinsel
    authority: "Otorite",
    determination: "Kararlılık",
    motivating: "Motivasyon",
    people_management: "İnsan Yönetimi",
    // Bilgi
    data_analysis: "Veri Analizi",
    judging_ability: "Oyuncu Yeteneğini Değerlendirme",
    judging_potential: "Oyuncu Potansiyelini Değerlendirme",
    judging_staff: "Personel Değerlendirme",
    negotiating: "Pazarlık",
    tactical_knowledge: "Taktik Bilgisi",
    // Sağlık
    physiotherapy: "Fizyoterapi",
    sports_science: "Spor Bilimi",
  },

  personality: {
    adaptability: "Uyum",
    ambition: "Hırs",
    loyalty: "Sadakat",
    pressure: "Baskıya Dayanıklılık",
    professionalism: "Profesyonellik",
    sportsmanship: "Sportmenlik",
    temperament: "Mizaç",
    controversy: "Tartışmacılık",
  },

  positions: {
    gk: "GK",
    sw: "SW",
    dl: "DL",
    dc: "DC",
    dr: "DR",
    dm: "DM",
    ml: "ML",
    mc: "MC",
    mr: "MR",
    aml: "AML",
    amc: "AMC",
    amr: "AMR",
    st: "ST",
    wbl: "WBL",
    wbr: "WBR",
  },

  clubFacilities: {
    training: "Antrenman",
    youth_facilities: "Altyapı Tesisleri",
    youth_coaching: "Altyapı Antrenörlüğü",
    youth_recruitment: "Altyapı Oyuncu Bulma",
    corporate: "Kurumsal",
  },

  supporterTraits: {
    loyalty: "Sadakat",
    passion: "Tutku",
    patience: "Sabır",
    affluence: "Zenginlik",
    temperament: "Mizaç",
    expectations: "Beklentiler",
  },

  supporterMix: {
    hardcore: "Fanatik",
    core: "Çekirdek",
    family: "Aile",
    fair_weather: "Fırsatçı",
    corporate: "Kurumsal",
    casual: "Ara sıra",
  },

  jobs: {
    1: "Oyuncu",
    2: "Antrenör",
    4: "Başkan",
    6: "Yönetici",
    10: "Futbol Direktörü",
    12: "Fizyoterapist",
    14: "Gözlemci",
    16: "Teknik Direktör",
    20: "Yardımcı Antrenör",
    22: "Duran Top Antrenörü",
    26: "Kondisyoner",
    34: "Kaleci Antrenörü",
    // Named as the game's Turkish text names them.
    38: "Sağlık Ekibi Sorumlusu",
    40: "Spor Bilimi Sorumlusu",
    44: "Baş Gözlemci",
    46: "Doktor",
    48: "Spor Bilimci",
    50: "Baş Fizyoterapist",
    58: "Transfer Analisti",
    60: "Performans Analisti",
    62: "Kıdemli Performans Analisti",
    64: "Altyapı Sorumlusu",
    66: "Kulübün Sahibi",
    // Code 4 is "Başkan" already: the two are told apart, as a job select with two of the same name would not be.
    70: "Kulüp Başkanı",
    86: "Kiralık Oyuncu Sorumlusu",
    88: "Teknik Yönetici",
  },

  fields: {
    current_ability: "Mevcut yetenek",
    potential_ability: "Potansiyel yetenek",
    height: "Boy (cm)",
    date_of_birth: "Doğum tarihi",
    asking_price: "İstenen bedel",
    nation: "Uyruk",
    city_of_birth: "Doğum yeri",
    "reputation.home": "Yerel itibar",
    "reputation.current": "Güncel itibar",
    "reputation.world": "Dünya itibarı",
    "international.caps": "Milli maç",
    "international.goals": "Milli gol",
    "international.u21_caps": "U21 maç",
    "international.u21_goals": "U21 gol",
    condition: "Enerji",
    match_sharpness: "Maç kondisyonu",
    jadedness: "Yorgunluk",
    morale: "Moral",
    "contract.wage": "Haftalık maaş",
    wageShare: "maaş payı",
    monthlyFee: "aylık bedel",
    optionFee: "satın alma opsiyonu",
    "contract.loyalty_bonus": "Haftalık sadakat primi",
    "contract.happiness": "Mutluluk",
    "contract.playing_time_happiness": "Forma süresi mutluluğu",
    "contract.unhappiness": "Mutsuzluk nedenleri",
    "contract.expires": "Sözleşme bitişi",
    "contract.squad_number": "Forma numarası",
    "contract.squad_status": "Forma süresi",
    "contract.transfer_listed": "Transfer listesinde",
    "contract.loan_listed": "Kiralık listesinde",
    "loan.expires": "Kiralık bitişi",
    "loan.option_fee": "Satın alma opsiyonu",
    "contract.job": "Görev",
    "tie.nationality": "İkinci uyruk",
    "tie.trainedInNation": "Yetiştiği ülke",
    "tie.trainedAtClub": "Yetiştiği kulüp",
    "tie.workPermit": "Çalışma izni gerekmeyen ülke",
    club: "Kulüp",
    injuries: "Sakatlıklar",
    cohesion: "Uyum",
    tactics: "Taktik aşinalığı",
    bans: "Cezalar",
    retirement: "Emeklilik",
    clause: "Sözleşme maddesi",
    "clause.amount": "Madde tutarı",
    "clause.condition": "Madde koşulu",
    captain: "Kaptan",
    vice_captain: "Yardımcı kaptan",
    reputation: "İtibar",
    "facilities.training": "Antrenman tesisleri",
    "facilities.youth_facilities": "Altyapı tesisleri",
    "facilities.youth_coaching": "Altyapı antrenörlüğü",
    "facilities.youth_recruitment": "Altyapı oyuncu bulma",
    "facilities.corporate": "Kurumsal tesisler",
    "finance.balance": "Bakiye",
    "finance.transfer_budget": "Transfer bütçesi",
    "finance.wage_budget": "Maaş bütçesi",
    "finance.total_wage_budget": "Toplam maaş bütçesi",
    "stadium.capacity": "Stadyum kapasitesi",
    "stadium.name": "Stadyum adı",
    "name.first": "Ad",
    "name.last": "Soyad",
    "name.common": "Bilinen ad",
    "name.full": "Tam isim",
    "stadium.seating": "Oturma kapasitesi",
    "stadium.used": "Kullanılan kapasite",
    "stadium.expansion": "Genişleme kapasitesi",
    "prize.win": "Galibiyet başına lig para ödülü",
    "prize.draw": "Beraberlik başına lig para ödülü",
    "prize.loss": "Mağlubiyet başına lig para ödülü",
  },

  profile: {
    close: "Profili kapat",
    loading: "Profil yükleniyor…",
    resize: "Profil panelini boyutlandır",
    resizeHint: "Paneli genişletmek ya da daraltmak için sürükleyin; eski genişliğine döndürmek için çift tıklayın",
    none: "—",

    // Header
    freeAgent: "Serbest",
    born: "Doğum",
    height: (cm) => `${cm} cm`,
    heightUnit: "cm",
    uid: "UID",
    currentAbility: "Mevcut yetenek",
    currentAbilityShort: "MY",
    potentialAbility: "Potansiyel yetenek",
    potentialAbilityShort: "PY",
    potentialRange: "Potansiyel bir aralık olarak belirlenmiş",

    // Attributes
    technical: "Teknik",
    goalkeeping: "Kalecilik",
    mental: "Zihinsel",
    physical: "Fiziksel",
    hidden: "Gizli",
    feet: "Ayaklar",
    personality: "Kişilik",
    raw: (raw, scale = 100) => `ham ${raw} / ${scale}`,
    lowerIsBetter: "düşük olan daha iyi",
    age: (age) => `${age} yaş`,

    // Positions
    positions: "Pozisyonlar",
    positionsSummary: (best) => `Pozisyon puanları: ${best}`,
    positionRatings: "Pozisyon puanları",
    positionTiers: {
      natural: "Doğal",
      accomplished: "Usta",
      competent: "Yeterli",
      unconvincing: "Yetersiz",
      ineffective: "Etkisiz",
    },
    positionTooltip: (position, rating, tier) => `${position} · ${rating} · ${tier}`,

    // Contract
    contract: "Sözleşme",
    wage: "Haftalık maaş",
    wageNote: (converted) =>
      converted
        ? "oyun sterlin tutar; FM'in kendi kuruyla gösterilir"
        : "oyun sterlin tutar; başka bir para birimi ayarlardan seçilebilir",
    signed: "İmza tarihi",
    expires: "Bitiş tarihi",
    joined: "Katılım tarihi",
    extendContract: (years: number) => `${years} yıl uzat`,
    extendingContract: "Uzatılıyor…",
    extendContractTitle: (years: number, until: string) => `Sözleşmeyi ${years} yıl uzatır, ${until} tarihinde biter`,
    squadStatus: "Forma süresi",
    squadStatusName: (status) => SQUAD_STATUSES[status] ?? `Durum ${status}`,
    contractType: "Sözleşme türü",
    contractTypeName: (code) => CONTRACT_TYPES[code] ?? `Tür ${code}`,
    squadNumber: "Forma numarası",
    transferListed: "Transfer listesinde",
    loanListed: "Kiralık listesinde",

    // Career
    career: "Kariyer",
    internationalCaps: "Milli maç",
    internationalGoals: "Milli gol",
    u21Caps: "U21 maç",
    u21Goals: "U21 gol",
    askingPrice: "İstenen bedel",
    notSet: "Belirlenmedi",
    reputation: "İtibar",
    reputationHome: "Yerel",
    reputationCurrent: "Güncel",
    reputationWorld: "Dünya",
    retirement: "Emeklilik",
    retires: "Emeklilik planı",
    noRetirement: "Oyun emekliliğini planlamamış",
    keepPlaying: "Emekli olmasını engelle",
    keepingPlaying: "Engelleniyor…",
    keepPlayingTitle: "Planlanan emekliliğini iptal eder ve “Olabildiğince uzun futbol oynar” özelliğini verir",

    // Medical
    morale: (value) => `${value} / 20`,
    traits: "Özellikler",
    noTraits: "Özelliği yok",
    traitName: (bit) => TRAIT_NAMES_TR[bit] ?? `Özellik ${bit}`,
    unhappiness: "Mutsuzluk",
    noUnhappiness: "Onu mutsuz eden bir şey yok",
    removeUnhappiness: "Hepsini kaldır",
    removingUnhappiness: "Kaldırılıyor…",
    removeUnhappinessTitle: "Mutsuzluk nedenlerinin hepsini listesinden kaldırır",
    removeUnhappinessFollows:
      "Takım arkadaşlarının onunla ilgili nedenleri oyun ilerleyince biter: oyunda Devam'a basın",
    concernSince: (date) => `${date} tarihinden beri`,
    concernAbout: (name) => `${name} hakkında`,
    concernKind: (kind) => (kind === 1 ? "Endişeli" : kind === 2 ? "İçsel" : `Tür ${kind}`),
    concernMotive: (concern: Concern) => reasonText(REASONS_TR, concern, placeNameTR) ?? `Neden ${concern.motive}`,
    clauses: "Primler ve maddeler",
    noClauses: "Prim ya da madde yok",
    loyaltyBonus: "Sadakat primi",
    happiness: "Mutluluk",
    playingTimeHappiness: "Forma süresi mutluluğu",
    moodTitle: "FMRTE'nin gösterdiği gibi, -100 ile 100 arasında; oyun bunu kelimelerle gösterir",
    clauseName: (kind) => CLAUSE_NAMES_TR[kind] ?? `Madde ${kind}`,
    loan: "Kiralık",
    loanAt: "Kiralık olduğu kulüp",
    loanParent: "Bağlı olduğu kulüp",
    loanFrom: "Başlangıç",
    loanUntil: "Bitiş",
    loanNumber: "Oradaki forma numarası",
    recall: "Kiralıktan geri çağır",
    recallTitle: "Oyuncuyu bugün kulübüne geri getir; önce sorar",
    recallAgain: "Tekrar geri çağır",
    makePermanent: "Kalıcı yap",
    makePermanentTitle: "Oyuncuyu kiralık olduğu kulüpte, o kulüple sözleşmeli olarak tut; önce sorar",
    recalledWaiting: "Geri çağrıldı · dönüşü bekleniyor",
    endsTodayWaiting: "Bugün bitiyor · dönüşü bekleniyor",
    pendingTitle:
      (parent) => `Kiralık bugün bitiyor: oyunda bir gün devam edin, oyuncu ${parent} kulübüne dönmüş olacak`,
    endPassed: (date) =>
      `Kiralığın ${date} tarihinde bitmesi gerekiyordu ama oyun oyuncuyu geri getirmedi. Tekrar geri çağırıp bir gün devam edin.`,
    loanCanRecall: "Geri çağrılabilir",
    loanCanRecallTitle: "Kulübünün onu oyunda geri çağırıp çağıramayacağı. Buradaki Kiralıktan geri çağır her iki durumda da çalışır",
    loanCanTerminate: "Erken bitirilebilir",
    loanCupMatches: "Kupa maçlarında oynar",
    loanAgainstClub: "Kendi kulübüne karşı oynar",
    loanOptionFee: "Satın alma opsiyonu",
    loanOptionFeeTitle: "Kiralık olduğu kulübün onu kalıcı olarak alabileceği bonservis",
    loanMonthlyFee: "Aylık ücret",
    loanMonthlyFeeTitle: "Kiralık olduğu kulübün, oynadığı her ay için kulübüne ödediği tutar",
    loanUnusedFee: "Oynamazsa aylık ücret",
    loanUnusedFeeTitle: "Kiralık olduğu kulübün, kullanılmadığı her ay için kulübüne ödediği tutar",
    clauseCondition: (kind, value) => {
      switch (kind) {
        case 10:
          return `${value} gol`;
        case 40:
          return `${value} asist`;
        case 41:
          return `${value} gol ve asist`;
        case 19:
          return `${value} milli maç`;
        case 11:
        case 13:
        case 25:
        case 26:
          return `${value} lig maçı`;
        case 22:
        case 29:
          return `${value} yıl`;
        case 3:
        case 4:
        case 5:
        case 8:
        case 9:
        case 14:
        case 15:
        case 20:
        case 21:
          return `%${value}`;
        default:
          return String(value);
      }
    },
    clauseExpires: (date) => `${date} tarihinde sona erer`,
    clauseExpiresAfter: (days) => `imzadan ${format(days)} gün sonra sona erer`,
    clauseProfitShare: (percent, amount) => `${amount} üzeri kârdan ${percent}`,
    clauseWage: (amount) => `haftalık ${amount}`,
    moraleTitle: "Oyundaki Genel Mutluluk: 10'da Memnun, 11'de Biraz Mutlu, 15 ve 20'de Aşırı Mutlu",
    jadednessTitle:
      "Maç oynamaktan ne kadar yıprandığı: -500 tamamen dinlenmiş demektir; yükseldikçe dinlenmesi gerekir",
    noInjuries: "Sakatlığı yok",
    unknownInjury: "Bilinmeyen sakatlık",
    injuryStarted: (date) => `Başlangıç: ${date}`,
    injuryBack: (dates) => `Beklenen dönüş: ${dates}`,
    heal: "İyileştir",
    healTitle: "Bu oyuncunun tüm sakatlıklarını oyunda iyileştir",
    noBans: "Cezası yok",
    banMatches: (matches) => `${format(matches)} maç`,
    banStarted: (date) => `Başlangıç: ${date}`,
    liftBans: "Kaldır",
    liftBansTitle: "Bu oyuncunun tüm cezalarını oyunda kaldır",

    // Above the attributes, while the profile is read
    maxAttributes: "Özellikleri tamamla",
    maxAttributesTitle: "Bütün özellikleri en iyiye çıkar: 20; sakatlık eğilimi ve sertlik için 1",
    maxAttributesDone: (count) => (count === 0 ? "Bütün özellikleri zaten en iyide" : `${changes(count)} yazıldı`),
    maxAttributesUndone: (count) => (count === 0 ? "Hiçbir şey geri alınmadı" : `${changes(count)} geri alındı`),
    undoMax: "Geri al",
    undoMaxTitle: "Eski özelliklerini oyuna geri yaz",
    freezeAttributes: "Özellikleri dondur",
    freezeAttributesNote: "Uygulama açık ve oyuna bağlıyken özellikleri düşmez; gelişmeler yine sayılır",
    maxStaffAttributesTitle: "Bu personelin bütün özelliklerini en iyiye çıkar: 20",
    undoMaxStaffTitle: "Eski özellikleri oyuna geri yaz",
    freezeStaffAttributesNote: "Uygulama açık ve oyuna bağlıyken özellikleri düşmez; gelişmeler yine sayılır",
    freezeFitness: "Enerji ve maç kondisyonunu dondur",
    freezeFitnessNote: "Uygulama açık ve oyuna bağlıyken enerjisi ve maç kondisyonu düşmez; artışlar yine sayılır",
    freezePositions: "Dondur",
    freezePositionsInfo: "Pozisyonları dondurmak ne yapar?",
    freezePositionsNote:
      "Uygulama açık ve oyuna bağlıyken pozisyon puanları olduğu gibi kalır: oyuncu başka bir pozisyona yakınlık " +
      "geliştirmez, puanları ne yükselir ne düşer. Uygulama bunu bu kayıt için hatırlar.",

    // Staff
    you: "Siz",
    youTitle: "Bu kayıtta yönettiğiniz teknik direktör",
    id: "ID",
    job: "Görev",
    changeJob: "Görevi değiştir",
    changeJobTitle: "Bu personele oyunda kulübünde başka bir görev ver",
    newJob: "Yeni görev",
    applyJob: "Uygula",
    cancelJob: "Vazgeç",
    unemployed: "İşsiz",
    coaching: "Antrenörlük",
    knowledge: "Bilgi",
    medical: "Sağlık",
    playerCoach: (job) => `${job} (oyuncu-antrenör)`,
    unknownJob: (code) => `Görev ${code}`,
  },

  playerList: {
    nav: "Oyuncular",
    count: (total) => `${format(total)} oyuncu`,
    search: "İsim veya UID ile oyuncu ara",
    summary: (total, shown, sorted) => {
      const count = `${format(total)} oyuncu`;
      if (total <= shown) {
        return count;
      }
      return sorted === null
        ? `${count} · mevcut yeteneğe göre ilk ${shown} gösteriliyor`
        : `${count} · ilk ${shown} gösteriliyor, sıralama: ${sorted.by} (${sorted.ascending ? "artan" : "azalan"})`;
    },
    empty: (query, filtered) => {
      if (query === "") {
        return filtered ? "Bu filtrelere uyan oyuncu yok." : "Oyuncu bulunamadı.";
      }
      return filtered
        ? `“${query}” aramasına ve bu filtrelere uyan oyuncu yok.`
        : `“${query}” aramasına uyan oyuncu yok.`;
    },
    columns: {
      name: "İsim",
      age: "Yaş",
      positions: "Pozisyonlar",
      nation: "Uyruk",
      club: "Kulüp",
      contractExpires: "Sözleşme",
      born: "Doğum",
      currentAbility: "MY",
      potentialAbility: "PY",
      uid: "UID",
    } satisfies Record<PlayerSort | "positions" | "born" | "uid", string>,
    sortBy: (by) => `Sırala: ${by}`,
    // Said as "sıralama: …" and "Sırala: …", so they stand as plain nouns.
    sortNames: {
      currentAbility: "mevcut yetenek",
      potentialAbility: "potansiyel yetenek",
      age: "yaş",
      name: "isim",
      nation: "uyruk",
      club: "kulüp",
      contractExpires: "sözleşme bitişi",
    } satisfies Record<PlayerSort, string>,
    filters: {
      toggle: "Filtreler",
      toggleActive: (count) => `Filtreler, ${count} etkin`,
      clear: "Temizle",
      any: "Tümü",
      position: "Pozisyon",
      gender: "Cinsiyet",
      men: "Erkek",
      women: "Kadın",
      age: "Yaş",
      minAge: "En düşük yaş",
      maxAge: "En yüksek yaş",
      minPlaceholder: "Min",
      maxPlaceholder: "Maks",
      minCurrentAbility: "Min MY",
      minCurrentAbilityTitle: "En düşük mevcut yetenek",
      minPotentialAbility: "Min PY",
      minPotentialAbilityTitle: "En düşük potansiyel yetenek",
      abilityPlaceholder: "1–200",
      nation: "Uyruk",
      club: "Kulüp",
      freeAgentsOnly: "Yalnızca serbest oyuncular",
      contractEndsBy: "Sözleşme bitişi (en geç)",
      transferListedOnly: "Yalnızca transfer listesindekiler",
      loanListedOnly: "Yalnızca kiralık listesindekiler",
      attributes: {
        heading: "Özellikler",
        attribute: "Özellik",
        pick: "Özellik seçin",
        min: (name) => (name ? `En az ${name}` : "En az"),
        max: (name) => (name ? `En çok ${name}` : "En çok"),
        add: "Özellik ekle",
        remove: (name) => (name ? `${name} satırını kaldır` : "Bu satırı kaldır"),
      },
      saved: {
        save: "Kaydet",
        saveTitle: "Geçerli filtreleri ve sıralamayı bir adla kaydet",
        name: "Kayıtlı filtrenin adı",
        namePlaceholder: "Filtre adı",
        ok: "Tamam",
        cancel: "İptal",
        select: "Kayıtlı filtreler",
        delete: "Sil",
        // The name stays as the user typed it, so the ending is not put on it: "Kayıtlı filtreyi sil: …".
        deleteTitle: (name) => `Kayıtlı filtreyi sil: ${name}`,
        replaceQuestion: (name) => `“${name}” adında bir kayıtlı filtre zaten var. Değiştirilsin mi?`,
        replace: "Değiştir",
        full: (max) =>
          `En fazla ${max} filtre kaydedilebilir. Önce birini silin ya da ` +
          "değiştirmek için kayıtlı bir filtrenin adını kullanın.",
      },
    },
  },

  staffList: {
    nav: "Personel",
    count: (total) => `${format(total)} personel`,
    search: "İsim veya ID ile personel ara",
    summary: (total, shown, sorted) => {
      const count = `${format(total)} personel`;
      if (total <= shown) {
        return count;
      }
      return sorted === null
        ? `${count} · mevcut yeteneğe göre ilk ${shown} gösteriliyor`
        : `${count} · ilk ${shown} gösteriliyor, sıralama: ${sorted.by} (${sorted.ascending ? "artan" : "azalan"})`;
    },
    empty: (query, filtered) => {
      if (query === "") {
        return filtered ? "Bu filtrelere uyan personel yok." : "Personel bulunamadı.";
      }
      return filtered
        ? `“${query}” aramasına ve bu filtrelere uyan personel yok.`
        : `“${query}” aramasına uyan personel yok.`;
    },
    columns: {
      name: "İsim",
      age: "Yaş",
      job: "Görev",
      club: "Kulüp",
      nation: "Uyruk",
      born: "Doğum",
      currentAbility: "MY",
      potentialAbility: "PY",
      id: "ID",
    },
    sortBy: (by) => `Sırala: ${by}`,
    sortNames: {
      currentAbility: "mevcut yetenek",
      potentialAbility: "potansiyel yetenek",
      age: "yaş",
      name: "isim",
      nation: "uyruk",
      club: "kulüp",
    },
    filters: {
      job: "Görev",
      anyJob: "Tümü",
      unemployedOnly: "Yalnızca işsizler",
    },
  },

  clubProfile: {
    // Header
    womensClub: "Kadın kulübü",
    founded: (year) => `Kuruluş ${year}`,
    reputationShort: "İtibar",
    reputationTitle: "İtibar",

    // The tabs under the header
    tabsLabel: "Kulüp bölümleri",
    tabs: { overview: "Genel", squad: "Kadro", staff: "Personel", stadium: "Stadyum" },
    squadLocked: "Kadroyu açmak için düzenlemeyi bitirin",
    staffLocked: "Personeli açmak için düzenlemeyi bitirin",

    facilities: "Tesisler",

    // Supporters
    supporters: "Taraftarlar",
    supporterMix: "Taraftar dağılımı",
    percent: (value) => `%${percents.format(value)}`,
    mixTooltip: (kind, percent) => `${kind} · ${percent}`,

    // Finances
    finances: "Finans",
    balance: "Bakiye",
    transferBudget: "Transfer bütçesi",
    wageBudget: "Maaş bütçesi (harcama)",
    totalWageBudget: "Toplam maaş bütçesi",
    ticketPrice: "Ortalama bilet fiyatı",
    perWeek: "haftalık",
    noFinances: "FM, finansı yalnızca oynanan liglerdeki kulüpler için tutar.",
    freeze: "Parayı dondur",
    freezeNote: "Uygulama açık ve oyuna bağlıyken bakiye düşmez; gelirler yine eklenir",

    // Club info
    stadium: "Stadyum",
    capacity: "Kapasite",
    seating: "Oturma",
    used: "Kullanılan",
    usedAll: "Tamamı",
    usedTitle: "Oyun bir sınır koyduğunda kapasitenin ne kadarını kullandığı; 0 tamamı demektir",
    expansion: "Genişleyebileceği",
    noStadium: "Bu kulübün stadyumu okunamadı.",
    stadiumName: "Adı",
    rename: "Adını değiştir",
    renameTitle: "Stadyuma başka bir ad verin; hemen yazılır",
    renameInfoLabel: "Yeniden adlandırma nasıl çalışır?",
    renameInfo:
      "Oyun stadyum adlarını kayıt dosyasında tutmaz; her kayıt yüklenişinde adları kendi veritabanından alır. Bu " +
      "yüzden FMLibreEditor yeni adı bu kayıt için hatırlar ve oyun kaydı her yüklediğinde birkaç saniye içinde yeniden " +
      "yazar; bunun için uygulamanın açık ve oyuna bağlı kalması gerekir. Kayıt uygulama kapalıyken yüklenirse oyun " +
      "kendi adını gösterir; uygulama yeniden bağlanınca yeni ad geri gelir. Eski ada dönmek için değişikliği " +
      "Değişiklikler bölümünden geri alın ya da stadyuma eski adını yeniden verin.",
    saveName: "Kaydet",
    renaming: "Kaydediliyor…",
    cancelRename: "Vazgeç",
    nameLength: (bytes, min, max) =>
      min <= 1
        ? `${bytes} / en çok ${max} karakter (ç, ğ, ı, ö, ş, ü gibi harfler iki sayılır)`
        : `${bytes} karakter: oyunun adı tuttuğu yere sığması için ${min} ile ${max} arası (ç, ğ, ı, ö, ş, ü gibi harfler iki sayılır)`,
    nameShared: (holders) =>
      `Bu adı oyunda ${holders} şey paylaşıyor; bu yüzden yalnızca bu stadyum için değiştirilemez`,
    info: "Kulüp bilgisi",
    seasonTickets: "Sezonluk biletler",
    socialMedia: "Sosyal medya takipçileri",
  },

  clubStaff: {
    loading: "Personel okunuyor…",
    empty: "Oyun bu kulüp için personel tutmuyor: bu kayıtta oynanmayan liglerin kulüplerinde personel yoktur.",
    count: (total, staying) =>
      staying === 0
        ? `${format(total)} personel`
        : `${format(total)} personel · diğerleri serbest bırakılırsa ${format(staying)} kişi kalır`,

    actionsLabel: "Bütün personele yönelik işlemler",
    releaseAll: (count) => (count === 0 ? "Tüm personeli serbest bırak" : `Tüm personeli serbest bırak (${format(count)})`),
    releaseAllTitle: "Siz ve yönetim dışında kulübün bütün personelini serbest bırak; önce sorar",
    releaseNone: "Bu kulübün personelinden serbest bırakılabilecek kimse yok",
    hint: "Siz ve yönetim dışında herkes kulüpten hemen ayrılır. Geri alma Değişiklikler bölümünde de var.",
    released: (count) => `${format(count)} personel serbest bırakıldı`,
    refused: (name, reason) => `${name}: ${reason}`,
    undo: "Geri al",
    undoTitle: "Serbest bırakılan personeli sözleşmeleriyle kulübe geri getir",

    tableLabel: "Kulübün personeli",
    staysColumn: "Kalıyor",
    stays: {
      you: "Siz",
      board: "Yönetim",
      player: "Aynı zamanda oyuncu",
      held: "Kulüp başka bir yerde tutuyor",
      other: "Serbest bırakılamaz",
    },

    title: "Tüm personeli serbest bırak",
    from: "Kulüp",
    leaving: (count) => `${format(count)} kişi kulüpten ayrılır`,
    staying: (count) => `${format(count)} kişi kalır`,
    more: (count) => `ve ${format(count)} kişi daha`,
    doesHeading: "Ne yapar",
    does: [
      "Her biri kulübün personelinden hemen ayrılır ve sözleşmesi sona erer: oyunun kendi kulüpsüz personeli gibi işsiz kalır",
      "Kimseye ödeme yapılmaz",
      "Teknik direktörlük ya da futbol direktörlüğü yeri, kulüp doldursun diye boş kalır",
      "Siz, yönetim ve editörün serbest bırakamadıkları kalır",
      "Değişiklikler bölümünde listelenir; tek geri alma hepsini aynı sözleşmelerle geri getirir",
    ],
    dialogHint: "Hepsini serbest bırak düğmesine basana kadar oyunda hiçbir şey değişmez.",
    release: "Hepsini serbest bırak",
    releasing: "Serbest bırakılıyor…",
    cancel: "İptal",

    moveAll: "Tüm personeli taşı",
    moveAllTitle: "Siz ve yönetim dışında kulübün bütün personelini başka bir kulübe taşı; önce sorar",
    moveNone: "Bu kulübün personelinden taşınabilecek kimse yok",
    moved: (count, club) => `${format(count)} personel ${club} kulübüne taşındı`,
    undoMoveTitle: "Taşınan personeli sözleşmeleriyle bu kulübe geri getir",
    moveTitle: "Tüm personeli taşı",
    moveSearch: "Personelin taşınacağı kulübü ara",
    movePick: "Personelin taşınacağı kulübü seçin.",
    movePlanning: "Kimlerin taşınabileceğine bakılıyor…",
    movePlan: (count, club) => `${format(count)} personel ${club} kulübüne taşınır`,
    moveNobody: (club) => `Bu kulübün personelinden ${club} kulübüne taşınabilecek kimse yok.`,
    moveStays: {
      managerTaken: (club) => `${club} kulübünün teknik direktörü var`,
      directorTaken: (club) => `${club} kulübünün futbol direktörü var`,
      yourClub: (club) => `${club} kulübünü siz yönetiyorsunuz`,
      other: "Taşınamaz",
    },
    moveDoes: [
      "Her biri yeni kulübe görevinin olduğu yerde katılır: sağlık, antrenörlük ya da gözlem bölümüne",
      "Görevi, maaşı ve sözleşme bitişi aynı kalır; her sözleşme oyundaki tarihle başlar",
      "Teknik direktör ya da futbol direktörü yalnızca yeni kulüpteki yeri boşsa katılır; burada boşalan yer, kulüp " +
        "doldursun diye boş kalır",
      "Siz, yönetim ve editörün taşıyamadıkları kalır",
      "Değişiklikler bölümünde listelenir; tek geri alma hepsini bu kulübe geri getirir",
    ],
    moveHint: "Hepsini taşı düğmesine basana kadar oyunda hiçbir şey değişmez.",
    move: "Hepsini taşı",
    moving: "Taşınıyor…",
  },

  clubList: {
    nav: "Kulüpler",
    count: (total) => `${format(total)} kulüp`,
    search: "İsim veya UID ile kulüp ara",
    summary: (total, shown) =>
      total > shown
        ? `${format(total)} kulüp · itibara göre ilk ${shown} gösteriliyor`
        : `${format(total)} kulüp`,
    empty: (query, filtered) => {
      if (query === "") {
        return filtered ? "Bu filtreye uyan kulüp yok." : "Kulüp bulunamadı.";
      }
      return filtered
        ? `“${query}” aramasına ve bu filtreye uyan kulüp yok.`
        : `“${query}” aramasına uyan kulüp yok.`;
    },
    women: "Kadın",
    columns: {
      name: "İsim",
      nation: "Ülke",
      league: "Lig",
      reputation: "İtibar",
      founded: "Kuruluş",
      uid: "UID",
    },
    filters: {
      kind: "Gösterilecek kulüpler",
      all: "Tüm kulüpler",
      men: "Erkek kulüpleri",
      women: "Kadın kulüpleri",
      nation: "Ülke",
      league: "Lig",
      anyLeague: "Tüm ligler",
      leagueTitle: "A takımın bu sezon oynadığı lig",
      reputation: "İtibar",
      reputationTitle: "Oyunun tuttuğu gibi 0 ile 10.000 arası",
      minReputation: "En düşük itibar",
      maxReputation: "En yüksek itibar",
    },
  },
  /** The Clubs tab's national teams: each nation's men's and women's team, its senior team's squad and reputation. */
  national: {
    /** The button of the Clubs tab's switch that lists them, and the palette's command to go there. */
    nav: "Milli takımlar",
    switchLabel: "Kulüpler veya milli takımlar",
    search: "Ada, koda veya UID'ye göre milli takım ara",
    summary: (total, shown) =>
      total > shown ? `Milli takımlar: ${format(total)} · itibara göre ilk ${shown} gösteriliyor` : `Milli takımlar: ${format(total)}`,
    /** The message under an empty table; `filtered` is whether a filter is in effect. */
    empty: (query, filtered) => {
      if (query === "") {
        return filtered ? "Bu filtreye uyan milli takım yok." : "Milli takım bulunamadı.";
      }
      return filtered ? `“${query}” aramasına ve bu filtreye uyan milli takım yok.` : `“${query}” aramasına uyan milli takım yok.`;
    },
    /** The small tag on a women's team. */
    women: "Kadın",
    columns: {
      name: "Ülke",
      code: "Kod",
      reputation: "İtibar",
      players: "Oyuncu",
      uid: "UID",
    },
    filters: {
      /** The label of the select of which teams to show. */
      kind: "Gösterilecek takımlar",
      all: "Tüm takımlar",
      men: "Erkek takımları",
      women: "Kadın takımları",
    },
    /** In the header of a profile, by the name. */
    womensTeam: "Kadın milli takımı",
    mensTeam: "Erkek milli takımı",
    reputationShort: "İTB",
    reputationTitle: "A takımın itibarı, 0 ile 10.000 arası",
    teamKinds: { 0: "A takım", 9: "U23", 10: "U21", 18: "U20", 11: "U19", 12: "U18" },
    teamType: (kind) => `Tür ${kind}`,
    teamsLabel: "Bu milli takımın takımları",
    teamReputation: (team) => `İtibar (${team})`,
    teamReputationTitle: "Bu takımın itibarı, 0 ile 10.000 arası",
    squadHeading: (team, count) => `${team}: ${format(count)} oyuncu`,
    squadLabel: (team) => `Milli takım oyuncuları: ${team}`,
    squadNote: "Oyunun bu takım için listelediği oyuncular, oyunun sırasıyla. Çağrılar, kaptanlar ve teknik direktörün sözleşmesi burada düzenlenmez.",
    details: {
      nation: "Ülke",
      founded: "Federasyonun kuruluşu",
      continent: "Kıta",
      staff: (count) => `Federasyon personeli (${format(count)})`,
      noStaff: "Federasyon personeli bulunamadı.",
      job: "Milli takımdaki görevi",
      team: "Takım",
      staffNote: "Oyundan okunur; burada düzenlenmez. Görev, kulüpteki değil, milli takımdaki görevidir.",
    },
    actionsHint: "İşlemler A takımın listelediği tüm oyunculara uygulanır. Geri alma Değişiklikler bölümünde de var.",
    noTeams: "Oyun bu milli takım için hiçbir takım tutmuyor, bu yüzden gösterilecek kadro veya itibar yok.",
    reading: "Kadro okunuyor…",
    noPlayers: "Oyun bu takım için oyuncu listelemiyor.",
    /** Where the tab cannot show national teams: why, for a version of the game the editor has not been checked with. */
    unavailableTitle: "Milli takımlar oyunun bu sürümünde kullanılamıyor",
    unavailableBuild: "Oyunun bu sürümünün milli takımları nerede tuttuğunu henüz kimse bulmadı; bu yüzden editör yanlış belleği okumak yerine hiçbirini göstermiyor.",
    unavailableUnreadable: "Editör, oyunun bu sürümünde milli takımları beklediği yere baktı ama bulduğu şey oyunun verisine benzemiyor; bu yüzden hiçbirini göstermiyor.",
  },

  leaguePrizes: {
    title: "Lig para ödülü",
    league: (league) => `Bu sezon ${league} ödemeleri`,
    reading: "Ligin para ödülleri oyundan okunuyor… İlk seferde yarım dakika ya da daha uzun sürebilir.",
    readAgain: "Yeniden oku",
    readAgainTitle: "Tutarları oyundan yeniden oku: o zamandan beri başlayan bir aşama da ödeme yapıyor olabilir",
    paysNothing: "Kulübün ligi bu sezon ne sezon sonu sıralamasına göre ne de maç başına para ödülü ödüyor.",
    stageStarted: "Oynanan aşama",
    stageFuture: "Henüz başlamamış aşama",
    alike: (count) => `${format(count)} grup veya aşamada aynı tutarlar`,
    byPosition: "Sezon sonu sıralamasına göre",
    place: (place) => `${format(place)}.`,
    perMatch: "Maç başına",
    win: "Galibiyet başına",
    draw: "Beraberlik başına",
    loss: "Mağlubiyet başına",
    noList: "Sıralamaya göre ödeme yok.",
    noPerMatch: "Maç başına ödeme yok.",
    note: "Eleme turlarının ödülleri (örneğin finalin kazananına ve kaybedenine ödenenler) ve katılım ücreti henüz okunmuyor.",
    unavailableBuild: "Oyunun bu sürümünün para ödüllerini nerede tuttuğunu henüz kimse kontrol etmedi; bu yüzden editör yanlış belleği okumak yerine hiçbirini göstermiyor.",
    unavailableUnreadable: "Editör para ödüllerini oyunun bu sürümünde beklediği yerde aradı, ama bulduğu veri oyunun verisine benzemiyor; bu yüzden hiçbirini göstermiyor.",
    edit: "Tutarları değiştir",
    editTitle: "Ligin bu aşamasında ödenen tutarları ligdeki her kulüp için değiştir",
    save: "Tutarları kaydet",
    saving: "Kaydediliyor…",
    cancel: "Vazgeç",
    everyClub: (league) =>
      `Bu değişiklik yalnızca bu kulübü değil, ${league} içindeki her kulübü etkiler. Oyun bunu kayıtta tutar, ama yalnızca bu sezon için: sonraki sezonu yine kendi tutarlarıyla kurar. Değişiklikler sekmesindeki Geri al eski tutarları geri getirir.`,
    infoLabel: "Para ödülündeki bir değişiklik ne kadar sürer",
    invalid: (most) => `0 ile ${most} arasında tam bir tutar girin.`,
    allNothing: "Hiçbir şey ödemeyen bir aşama artık listelenmez: en az bir tutarı sıfırın üzerinde bırakın.",
    placeField: (place) => `${format(place)}. sıra için lig para ödülü`,
    changedIn: (league, groups) =>
      groups > 1 ? `${league} içindeki her kulüp için, ${format(groups)} grupta` : `${league} içindeki her kulüp için`,
  },

  sponsorships: {
    title: "Sponsorluk anlaşmaları",
    reading: "Kulübün sponsorluk anlaşmaları okunuyor…",
    none: "Kulübün sponsorluk anlaşması yok.",
    perSeason: "Sezon başına",
    total: "Toplam değer",
    term: "Süre",
    years: (count) => `${format(count)} yıl`,
    unnamed: (kind) => `Tür ${format(kind)}`,
    unnamedTitle: "Bu anlaşma türü henüz oyunun ekranındaki bir adla eşleştirilmedi",
    ended: "Bitti",
    endedTitle: "Oyundaki tarihten önce bitti: oyunun Sponsorluk ekranı artık onu göstermiyor",
    falls: (percent) => `Küme düşerse %${format(percent)} azalır`,
    rises: (percent) => `En üst lige çıkılırsa %${format(percent)} artar`,
    note: "Yalnızca okunur. Bunlar oyunun her anlaşma için tuttuğu tutarlardır. Oyunun Sponsorluk ekranı bitmemiş anlaşmaları listeler.",
    unavailableBuild: "Oyunun bu sürümünün sponsorluk anlaşmalarını nerede tuttuğunu henüz kimse denetlemedi; bu yüzden editör yanlış belleği okumak yerine hiçbirini göstermiyor.",
    unavailableUnreadable: "Editör sponsorluk anlaşmalarını oyunun bu sürümünde beklediği yerde aradı, ancak bulduğu şey oyunun verisi gibi okunmuyor; bu yüzden hiçbirini göstermiyor.",
  },

  competitions: {
    nav: "Organizasyonlar",
    search: "Organizasyonları ad, ülke ya da UID ile ara",
    summary: (total, shown) =>
      total > shown ? `${format(total)} organizasyondan ${format(shown)} tanesi` : `${format(total)} organizasyon`,
    empty: (query, filtered) => {
      if (query === "") {
        return filtered ? "Bu ülkede kadro kuralı olan organizasyon yok." : "Kadro kuralı olan organizasyon bulunamadı.";
      }
      return filtered ? `Bu ülkede “${query}” ile eşleşen organizasyon yok.` : `“${query}” ile eşleşen organizasyon yok.`;
    },
    reading: "Organizasyonların kadro kuralları oyundan okunuyor… Bu birkaç saniye sürer.",
    readAgain: "Yeniden oku",
    readAgainTitle: "Kuralları oyundan yeniden oku",
    listNote: "Yalnızca oyunun bu kayıtta oynattığı organizasyonlar listelenir.",
    unavailableTitle: "Gösterilecek kadro kuralı yok",
    unavailableBuild: "Oyunun bu sürümünün organizasyonların kadro kurallarını nerede tuttuğunu henüz kimse denetlemedi; bu yüzden editör yanlış belleği okumak yerine hiçbirini göstermiyor.",
    unavailableUnreadable: "Editör kadro kurallarını oyunun bu sürümünde beklediği yerde aradı, ama bulduğu veri oyunun verisine benzemiyor; bu yüzden hiçbirini göstermiyor.",
    columns: {
      name: "Organizasyon",
      nation: "Ülke",
      level: "Kademe",
      rules: "Kural",
      uid: "UID",
    },
    level: (level) => format(level),
    rulesCount: (current, next) =>
      next === null || next === current ? format(current) : `${format(current)} · ${format(next)}`,
    rulesCountTitle: "Bu sezonki kadro kuralı sayısı; gelecek sezon farklıysa o da",
    international: "Uluslararası",
    filters: {
      nation: "Ülke",
      allNations: "Tüm ülkeler",
    },
    title: "Kadro kuralları",
    intro: "Bu organizasyonda bir kadroya belli türden kaç oyuncu kaydedilebileceği ya da bir maç için kaç oyuncu seçilebileceği. Kimin yabancı ya da altyapıdan yetişmiş sayılacağına oyun kendisi karar verir.",
    seasons: { current: "Bu sezon", next: "Gelecek sezon" },
    began: (year) => `${year} yılında başladı`,
    begins: (year) => `${year} yılında başlıyor`,
    noRules: "Kadro kuralı yok.",
    noNext: "Oyun gelecek sezon için kural tutmuyor.",
    noneGiven: "Oyun bu organizasyona hiç kadro kuralı vermiyor, bu yüzden burada değiştirilecek bir şey yok.",
    ruleColumns: {
      rule: "Kural",
      where: "Sayıldığı yer",
      limit: "Sınır",
      value: "Oyuncu",
    },
    atMost: "En fazla",
    atLeast: "En az",
    scopes: {
      squad: "Kadro",
      matchSquad: "Maç kadrosu",
      eleven: "On bir",
      startingEleven: "İlk 11",
      bench: "Yedek kulübesi",
    },
    who: {
      squadSize: "Kadrodaki oyuncular",
      foreign: "Yabancı oyuncular",
      foreignExceptAsian: "Yabancı oyuncular (Asyalılar hariç)",
      foreignGoalkeepers: "Yabancı kaleciler",
      nonEu: "AB dışı oyuncular",
      domestic: "Yerli oyuncular",
      domesticGoalkeepers: "Yerli kaleciler",
      goalkeepers: "Kaleciler",
      outfield: "Saha oyuncuları",
      nonHomegrown: "Altyapıdan yetişmemiş oyuncular",
      youthContract: "Altyapı sözleşmeli oyuncular",
      fullTime: "Tam zamanlı sözleşmeli oyuncular",
      amateur: "Amatör oyuncular",
      youthOrAmateur: "Altyapı ya da amatör oyuncular",
      trialists: "Deneme oyuncuları",
      loans: "Kiralık oyuncular",
      internationals: "Uluslararası oyuncular",
      otherTeam: "Başka bir takıma kayıtlı oyuncular",
      firstTeam: "A takıma kayıtlı oyuncular",
      over: (age) => `${format(age)} yaş üstü oyuncular`,
      under: (age) => `${format(age)} yaş altı oyuncular`,
      domesticUnder: (age) => `${format(age)} yaş altı yerli oyuncular`,
      foreignOver: (age) => `${format(age)} yaş üstü yabancı oyuncular`,
      goalkeepersOver: (age) => `${format(age)} yaş üstü kaleciler`,
      outfieldOver: (age) => `${format(age)} yaş üstü saha oyuncuları`,
      homegrown: (from, fromAge, toAge) => {
        const ages = `${format(fromAge)}–${format(toAge)} yaş arasında`;
        if (from === "club") {
          return `Kulüpte yetişen oyuncular (${ages})`;
        }
        return from === "nation" ? `Ülkede yetişen oyuncular (${ages})` : `Kulüpte ya da ülkede yetişen oyuncular (${ages})`;
      },
      homegrownUnder: (age, fromAge, toAge) =>
        `Ülkede yetişen ${format(age)} yaş altı oyuncular (${format(fromAge)}–${format(toAge)} yaş arasında)`,
    },
    unnamedKind: (kind) => `${format(kind)} türündeki kural`,
    gameKey: (key) => `Oyunun bu kurala verdiği ad: ${key}`,
    teamsFrom: (competition) => `${competition} takımları`,
    teamsFromUnknown: "Başka bir ligin takımları",
    condition: (code) => `Koşullu (${code})`,
    conditionTitle: "Oyun bu kuralı kendi belirlediği bir koşulla uygular; editör bu koşulu henüz açıklamıyor.",
    years: (from, to) => {
      if (from !== null && to !== null) {
        return from === to ? `${from}` : `${from}–${to}`;
      }
      return from !== null ? `${from} ve sonrası` : `${to} yılına kadar`;
    },
    yearsTitle: "Ülkenin kurallarının bu kuralı verdiği sezonlar, sezonun başladığı yıla göre",
    leftAlone: "Dokunulmuyor",
    notSavedTitle: "Kayıtta böyle bir kural yok, değişiklik kayıt yüklenince kaybolurdu: editör bu kurala dokunmuyor",
    notACountTitle: "Bu bir oyuncu sayısı değil, bir para tutarı: editör buna dokunmuyor.",
    noneChangeable: "Bu kurallar şimdilik hiçbir tarihte değiştirilemiyor: editör bir kuralı yalnızca kayıtta tutulan kurallarda da bulduğunda değiştirir (böylece değişiklik kayıt yüklendiğinde yerinde kalır) ve bu organizasyonun kurallarını orada bulamadı. Şimdilik kadın ligleri, MLS ve birkaç kupa bu durumda.",
    unsavedNote: "Oyun bu organizasyonun kurallarını hiçbir kayıtta tutmaz: her kayıt yüklemesinde ve her yeni sezonda kendisi yeniden kurar. Bu yüzden editör buradaki değişikliği tutar: çalışan oyuna yazar, bu kariyer için hatırlar ve oyuna her bağlandığında ya da verileri yeniden okuduğunda yeniden yazar. Bir kayıt yükledikten sonra değişikliğin geri gelmesi için editörü bir kez bağlayın (ya da Verileri yeniden oku'ya basın). Değişiklikler sekmesindeki Geri al tutmayı bırakır.",
    heldTag: "Tutuluyor",
    heldTitle: (original) =>
      `Editör bu sayıyı tutuyor ve oyunu her okuduğunda yeniden yazıyor; oyunun kendi değeri ${format(original)}`,
    savedDiffers: (value) => `Kayıttaki kurallarda ${format(value)}`,
    savedDiffersTitle:
      "Oyun bu listeyle oynar ve onu yüklerken kayıttaki kurallardan kurar; buradaki değişiklik ikisini de ayarlar",
    edit: "Kuralları değiştir",
    editTitle: "Bu organizasyonun kadro kurallarındaki sayıları değiştir",
    save: "Kuralları kaydet",
    saving: "Kaydediliyor…",
    cancel: "Vazgeç",
    invalid: (most) => `0 ile ${format(most)} arasında bir tam sayı girin.`,
    shared: (names) => `Bu kurallar şunların da kurallarıdır: ${names}. Yapılan değişiklik onlar için de geçerli olur.`,
    currentNote: (turn) =>
      `Buradaki değişiklik bu sezonun sonuna kadar geçerlidir${turn === null ? "" : `; sezon ${turn} günü döner`}. Oyun kadroları değişikliğe göre hemen sayar; oyunun kendi ekranları değişikliği bir gün geçince gösterir.`,
    nextNote: (turn) =>
      `Buradaki değişiklik sezon döndüğünde${turn === null ? "" : ` (${turn})`} bu sezonun kuralı olur ve oyunun sonraki bir sezon için kendi kuralı yoksa sonraki sezonlarda da kalır. Oyunun Gelecek Sezon sayfası değişikliği hemen gösterir.`,
    lasts: "Değişiklik hem oyunun kullandığı listeye hem de ülkenin kayıtta tutulan kurallarına yazılır; böylece kayıt yüklendiğinde yine yerindedir. Bu sezonun kuralındaki değişiklik sezon dönünce biter: yerini gelecek sezonun kuralları alır. Değişiklikler sekmesindeki Geri al eski sayıyı geri getirir.",
    infoLabel: "Kadro kuralındaki bir değişiklik ne kadar sürer",
    ruleField: (season, rule) => `Kadro kuralı, ${season.toLocaleLowerCase("tr")}: ${rule}`,
    alsoFor: (count) => `Aynı kurallarla oynanan ${format(count)} organizasyon için de geçerli`,
  },

  app: {
    stage: "beta",
    settingsLabel: "Ayarlar",
    languageLabel: "Dil",
    currencyLabel: "Para birimi",

    noteEditable: "Düzenlemeler yalnızca uyguladığınızda oyuna işlenir. Önce kayıt dosyanızı yedekleyin.",
    noteReadOnly: "Salt okunur: Windows, FMLibreEditor'ın oyuna yazmasına izin vermedi.",
    noteUnknownBuild: "Salt okunur: oyunun bu sürümü FMLibreEditor için yeni.",
    noteNotConnected: "Siz düzenleyip uygulamadan oyunda hiçbir şey değişmez.",

    notConnected: "Bağlı değil",
    previewTag: "tarayıcı önizlemesi · örnek veriler",
    noDate: "Oyun içi tarih yok",
    noDateTitle:
      "Oyun içi tarih okunamadı: yaşlar gösterilmiyor, yaş filtreleri kimseyi bulmuyor. Güncellemeleri kontrol edin.",
    reload: "Verileri yeniden oku",
    refresh: "Yenile",
    detecting: "Football Manager aranıyor…",
    connecting: "Oyuncular, personel ve kulüpler okunuyor…",
    reloading: "Oyuncular, personel ve kulüpler yeniden okunuyor…",

    saveChanged: {
      title: "Oyundaki kayıt değişti",
      text:
        "FMLibreEditor oyunu okuduktan sonra oyun bir kayıt yükledi ya da ana menüye döndü. “Verileri yeniden oku”ya " +
        "basana kadar oyunda hiçbir şeyi değiştirmez ve dondurulanları tutmaz: gösterdikleri başka bir kayda ait olabilir.",
    },

    refrozen: {
      title: "Geçen seferden yeniden donduruldu",
      waitingTitle: "Dondurulanlar şimdilik bekliyor",
      players: (names) => `Özellikler: ${names}`,
      staff: (names) => `Personel özellikleri: ${names}`,
      clubs: (names) => `Para: ${names}`,
      fitness: (names) => `Enerji ve maç kondisyonu: ${names}`,
      positions: (names) => `Pozisyonlar: ${names}`,
      stadiums: (names) => `Stadyum adları: ${names}`,
      more: (count) => `ve ${format(count)} tane daha`,
      waiting: (count) =>
        `${format(count)} tanesi hatırlanıyor ama şu an dondurulmadı: FMLibreEditor oyunun bu sürümüne henüz yazamıyor.`,
      dismiss: "Kapat",
    },

    freezeInfo: {
      label: "Dondurma nasıl çalışır?",
      note:
        "Dondurma oyunu kalıcı olarak değiştirmez: FMLibreEditor her 2 saniyede bir oyunun düşürdüğünü geri koyar. Bu " +
        "yüzden yalnızca uygulama açık ve oyuna bağlıyken çalışır; uygulamayı kapatırsanız oyun değerleri yine " +
        "düşürür. Uygulama bu kayıtta neyin dondurulduğunu hatırlar ve kayda bir sonraki bağlanışında yine dondurur.",
    },

    connect: {
      title: "Football Manager 27'ye bağlan",
      intro:
        "FMLibreEditor, oyun çalışırken oyunun belleğini okur. " +
        "Oyunu başlatıp bir kayıt yükleyin, ardından bağlanın.",
      notRunning: "Football Manager 27 çalışmıyor.",
      openFailed: (error) => `Oyun açılamadı: ${error}`,
      game: "Oyun",
      gameData: "Oyun verisi",
      loaded: "Yüklendi",
      stillLoading: "Hâlâ yükleniyor; ana menüyü bekleyin",
      process: "İşlem",
      pid: (pid) => `pid ${pid}`,
      several: "Oyunun birden fazla kopyası çalışıyor; ilki kullanılıyor.",
      button: "Bağlan ve oyuncuları, personeli ve kulüpleri oku",

      bridge: {
        title: "Köprü (macOS)",
        intro:
          "macOS, hiçbir uygulamayı başka bir uygulamanın belleğine sokmaz; bu yüzden FM27 belleğini kendisi açmalı. " +
          "Bunu FMLibreEditor'ın köprüsünü yüklediğinde yapar: köprü, oyunda hiçbir şeye kanca atmayan ve hiçbir " +
          "şeyi değiştirmeyen, oyunun belleğini yalnızca bu uygulamaya veren küçük bir kütüphanedir. FM27'nin onu " +
          "yüklemesi için Steam'de bir başlatma seçeneği gerekir.",
        library: "Köprü",
        installed: "Kurulu",
        missing: "Kurulu değil",
        launchOption: "Başlatma seçeneği",
        set: "Steam'de ayarlı",
        notSet: "Ayarlı değil",
        ready:
          "Hazır. FM27'yi Steam'den başlatın (açıksa kapatıp yeniden başlatın), bir kayıt yükleyin, ardından bağlanın.",
        steamRunning:
          "Steam açık ve açıkken başlatma seçeneklerini kendisi tutuyor. Seçeneğin sizin için ayarlanması için " +
          "Steam'den çıkın ya da seçeneği Steam'de kendiniz girin.",
        setUp: "Köprüyü kur",
        remove: "Köprüyü kaldır",
        manual:
          "Ya da Steam'de Football Manager 27'ye sağ tıklayıp Özellikler › Genel › Başlatma Seçenekleri'ne şunu girin:",
        copy: "Kopyala",
        copied: "Kopyalandı",
      },
    },
  },

  graphics: {
    reading: "Grafik paketleri okunuyor…",
    summary: ({ clubLogos, flags, faces }) =>
      `Grafikler: ${format(clubLogos)} kulüp logosu · ${format(flags)} bayrak · ${format(faces)} yüz`,
    none: "Grafik paketi bulunamadı",
    noneHint: "Logo ve yüz paketleri FM27'nin graphics klasörüne kurulur.",
  },

  compatibility: {
    unknownBuild: (game) => `FMLibreEditor henüz ${game} ile denenmedi`,
    unknownBuildText:
      "Oyun büyük ihtimalle güncellendi. FMLibreEditor oyunun verilerini buldu ve denetledi, ama denenmediği bir sürüme " +
      "siz izin vermeden yazmaz. Bu sürümü tanıyan yeni bir FMLibreEditor genellikle birkaç gün içinde çıkar.",
    failedTitle: "Oyunun verilerinin bir kısmı denetimden geçmedi",
    reloadHint: "Kayıt hâlâ yükleniyorduysa “Verileri yeniden oku” yeniden denetler.",
    noDate: "Oyun içi tarih denetimden geçmedi, bu yüzden yaşlar gösterilmiyor.",
    failed: (names) => `Salt okunur bırakılanlar: ${names}.`,
    failedCheck: (name, fit, sampled) => `${name} (${format(sampled)} örnekten ${format(fit)} uygun)`,
    join: (names) =>
      names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]}`,
    allow: "Yine de düzenle",
    allowTitle: "Düzenlemeyi uygulama kapanana ya da yeniden bağlanana kadar açar. Önce kayıt dosyanızı yedekleyin.",
  },

  diagnostics: {
    copy: "Tanılama bilgisini kopyala",
    copyTitle: "Uygulamanın oyunda bulduklarını hata bildirimi için kopyalar; isim ya da dosya yolu içermez",
    copied: "Kopyalandı",
    failed: (reason) => `Tanılama bilgisi kopyalanamadı: ${reason}`,
  },

  checks: {
    gameDate: "oyun içi tarih",
    players: "oyuncu bilgileri",
    positions: "mevkiler",
    attributes: "nitelikler",
    personality: "kişilik",
    liveValues: "enerji, maç keskinliği, yorgunluk ve moral",
    contracts: "sözleşmeler",
    teams: "takımlar",
    staff: "personel",
    clubs: "kulüpler",
    cohesion: "kulüplerle uyum",
    tactics: "taktik aşinalığı",
  },

  update: {
    available: (version) => `FMLibreEditor ${version} yayımlandı`,
    youHave: (version) => `Sizdeki sürüm: ${version}.`,
    download: "İndir",
    install: "Güncelle",
    installTitle: "Yeni sürümü indir ve kur; uygulama kapanıp yeni sürümle yeniden açılır",
    preparing: "Hazırlanıyor…",
    downloading: (percent) => (percent === null ? "İndiriliyor…" : `İndiriliyor… %${percent}`),
    installing: "Kuruluyor: FMLibreEditor kapanıp yeni sürümle yeniden açılacak.",
    installFailed: (reason) => `Güncellenemedi: ${reason}. Bunun yerine sayfasından indirin.`,
    notInstallable: "Bu sürüm buradan kurulamıyor. Bunun yerine sayfasından indirin.",
    later: "Sonra",
    check: "Güncellemeleri denetle",
    checking: "Güncellemeler denetleniyor…",
    upToDate: "En son sürümü kullanıyorsunuz.",
    failed: "Güncellemeler denetlenemedi.",
  },

  star: {
    title: "FMLibreEditor'ı beğendiniz mi?",
    text: "GitHub'da bir yıldız, daha çok oyuncuya ulaşmasına ve daha hızlı gelişmesine yardımcı olur.",
    star: "GitHub'da yıldız ver",
    dismiss: "Kapat",
  },

  edit: {
    unknownNation: "Bilinmeyen ülke",
    unknownCity: "Bilinmeyen şehir",
    edit: "Düzenle",
    editTitle: "Bu profilin değerlerini oyunda değiştir",
    startFailed: (reason) => `Düzenleme başlatılamadı: ${reason}`,
    positionRating: (position) => `${position} puanı`,
    was: (value) => `önceki: ${value}`,
    invalid: (min, max) => `${min} ile ${max} arasında bir tam sayı girin`,
    invalidDate: (from, to) => `${from} ile ${to} arasında bir tarih girin`,
    invalidMoney: (from, to) => `${from} ile ${to} arasında tam bir tutar girin`,
    invalidPercentage: (from, to) => `${from} ile ${to} arasında tam sayı bir yüzde girin`,
    percent: "%",
    yes: "Evet",
    no: "Hayır",
    none: "yok",

    // The footer
    footer: "Düzenleme",
    changes: changeCount,
    invalidCount: (count) => `${count} geçersiz`,
    review: "Gözden geçir",
    reviewList: "Uygulanacak değişiklikler",
    discard: "Vazgeç",
    apply: "Uygula",
    applying: "Uygulanıyor…",
    applyBlocked: "Önce geçersiz değerleri düzeltin",
    done: "Bitti",
    confirmDiscard: (count) => `${format(count)} değişiklikten vazgeçilsin mi?`,
    keepEditing: "Düzenlemeye devam et",

    // After Apply
    applied: (count) => `${changes(count)} uygulandı`,
    nothingToChange: "Değiştirilecek bir şey yok: oyunda bu değerler zaten var.",
    refused: (label, reason) => `${label}: ${reason}`,
    rereadFailed: (reason) => `Değerler geri okunamadı: ${reason}`,
    dismiss: "Kapat",
  },

  changes: {
    nav: "Değişiklikler",
    title: "Değişiklikler",
    hint:
      "En yenisi en üstte. Uygulama her kariyerin değişikliklerini saklar; yeniden başlatınca da listelenirler. Bir değişiklik, ancak oyun yazdığı değeri hâlâ tutuyorsa geri alınabilir.",
    /** Under the hint, when the list holds changes from earlier sessions: how many, and how many of them the game did not hold. */
    earlierNote: (count, missing) =>
      `Önceki oturumlardan ${format(count)} değişiklik` +
      (missing > 0 ? `; ${format(missing)} tanesi veriler okunduğunda oyunda yoktu` : "") +
      ". Bunlar arasındaki transferler, iyileştirmeler, bağlar, maddeler ve isimler geçmiş olarak durur, geri alınamaz.",
    /** The small tag after the name of an earlier change, and its hover text. */
    earlierTag: "Önceki",
    earlierTitle: "Uygulama son bağlandığından önce yazıldı; bu kariyerin geçmişinde saklanıyor",
    /** Under the status of an earlier change: whether the game held its value when the data was last read. */
    inGame: "Oyunda",
    inGameTitle: "Veriler son okunduğunda oyun bu değeri tutuyordu",
    notInGame: "Oyunda değil",
    notInGameTitle:
      "Veriler son okunduğunda oyunda yoktu: değişiklikten sonra kaydedilmedi ya da oyun onu sonradan değiştirdi",
    /** In the place of Undo for an earlier change that cannot be undone from here, and its hover text. */
    historyOnly: "Geçmiş",
    historyOnlyTitle: "Uygulama son bağlandığından önce yapıldı: geri almak için oyunun belleğinin o anki hâli gerekiyordu",
    /** Under a mass edit: how many of its earlier changes the game did not hold. */
    batchNotInGame: (count) => `${format(count)} tanesi oyunda değil`,
    /** Empties the list and the history of the career; the question that asks first, and its two answers. */
    clearHistory: "Geçmişi temizle",
    clearHistoryTitle: "Bu listeyi boşalt ve bu kariyerin geçmişini unut; değişiklikler oyunda kalır",
    confirmClear: "Bu kariyerin geçmişi temizlensin mi? Değişiklikler oyunda kalır, ama artık buradan geri alınamaz.",
    keepHistory: "Vazgeç",
    clearConfirm: "Temizle",
    continueHint: "Oyun değişiklikleri bir kez ilerleyince gösterir: oyunda Devam'a basın.",
    swappedWith: (name) => `Takas: ${name}`,
    released: (name) => `${name} serbest bırakıldı`,
    fee: (amount) => `Bedel ${amount}`,
    arranged: (date) => `Oyun transferi ${date} tarihinde yapar`,
    arrangedLoan: (day, until) => `Oyun kiralığı ${day} tarihinde yapar; ${until} tarihine kadar sürer`,
    optionRemoved: (amount) => `Satın alma opsiyonu (${amount}) kaldırıldı`,
    healed: (count) => `${format(count)} sakatlık iyileştirildi`,
    lifted: (count) => `${format(count)} ceza kaldırıldı`,
    keptPlaying: (date) => (date === null ? "Oynamaya devam edecek" : `${date} tarihli emeklilik engellendi`),
    count: (total, undone) => {
      const count = changeCount(total);
      return undone === 0 ? count : `${count} · ${undone} geri alındı`;
    },
    empty:
      "Henüz değişiklik yok. Bir oyuncu, personel veya kulüp açıp Düzenle düğmesine basın " +
      "ya da bir listede Toplu düzenleme düğmesini kullanın.",
    columns: {
      time: "Saat",
      name: "İsim",
      field: "Alan",
      change: "Değişiklik",
      status: "Durum",
    },
    kinds: {
      player: "Oyuncu",
      staff: "Personel",
      club: "Kulüp",
      nationalTeam: "Milli takım",
      competition: "Organizasyon",
    } satisfies Record<EditEntity, string>,
    stored: (change) => `saklanan ${change}`,
    undone: (time) => `Geri alındı: ${time}`,
    undo: "Geri al",
    undoTitle: (label) => `Eski değeri oyuna geri yaz: ${label}`,
    batch: "Toplu düzenleme",
    batchCount: (total, remaining) =>
      remaining === 0
        ? `${changes(total)} · hepsi geri alındı`
        : `${changes(total)} · ${format(remaining)} tanesi geri alınmadı`,
    showChanges: "Değişiklikleri göster",
    hideChanges: "Değişiklikleri gizle",
    undoBatch: "Toplu düzenlemeyi geri al",
    undoBatchTitle: (remaining) =>
      `Bu toplu düzenlemenin eski değerlerini oyuna geri yaz (${changes(remaining)} hâlâ yerinde)`,

    pages: "Liste sayfaları",
    batchPages: "Bu toplu düzenlemenin değişiklik sayfaları",
    previous: "Önceki",
    next: "Sonraki",
    range: (first, last, total) => `${format(first)}–${format(last)} / ${format(total)}`,

    // Search and filters
    /** The search box: what it looks through. Its name for assistive technology is the same. */
    searchPlaceholder: "İsim, UID, alan veya kulüp ile değişiklik ara",
    /** The name of the three buttons that choose which sessions' changes are listed, for assistive technology. */
    sessionGroup: "Oturum",
    sessions: { all: "Tümü", this: "Bu oturum", earlier: "Önceki oturumlar" },
    /** The check boxes: only changes still in place, and only earlier ones the game did not hold; their hover text. */
    notUndone: "Geri alınmamış",
    notUndoneTitle: "Yalnızca hâlâ yerinde olan değişiklikler",
    notInGameFilterTitle: "Yalnızca veriler son okunduğunda oyunun tutmadığı önceki değişiklikler",
    /** Takes the search text and every choice away. */
    clearFilter: "Filtreyi temizle",
    /** The line beside the title while a search or a filter is on: `matching` of the `total` changes, `undone` of those undone. */
    filteredCount: (matching, total, undone) => {
      const count = `${format(matching)} / ${changes(total)}`;
      return undone === 0 ? count : `${count} · ${format(undone)} geri alındı`;
    },
    /** Under a mass edit while a search or a filter is on: how many of its changes they leave. */
    batchMatching: (matching, total) => `${format(matching)} / ${format(total)} eşleşiyor`,
    /** In the place of the list when the search and the filters leave no change. */
    noMatches: "Arama ve filtrelere uyan değişiklik yok.",
  },

  export: {
    button: "Dışa aktar",
    buttonTitle: {
      player: "Listedeki oyuncuları CSV veya JSON dosyasına yaz",
      staff: "Listedeki personeli CSV veya JSON dosyasına yaz",
      club: "Listedeki kulüpleri CSV veya JSON dosyasına yaz",
    },
    title: { player: "Oyuncuları dışa aktar", staff: "Personeli dışa aktar", club: "Kulüpleri dışa aktar" },
    scope: (entity, count) =>
      count === 0
        ? `Arama ve filtrelere uyan ${nouns[entity].plain} yok.`
        : `${entityCount(entity, count)}: listenin arama ve filtrelerinin seçtikleri, listedeki sırayla.`,
    formatLabel: "Biçim",
    formats: {
      csv: "CSV, virgülle ayrılmış",
      csvSemicolon: "CSV, noktalı virgülle ayrılmış",
      json: "JSON",
    },
    formatHints: {
      csv: "Çoğu tablo programı ve betik için",
      csvSemicolon: "Ondalıkları virgülle yazan Excel için: Türkçe, İspanyolca ya da Almanca Excel gibi",
      json: {
        player: "Betikler için: pozisyonlar, özellikler ve kişilik ayrı nesneler olarak",
        staff: "Betikler için: özellikler, kişilik ve sözleşme ayrı nesneler olarak",
        club: "Betikler için: taraftarlar, tesisler, stadyum ve mali durum ayrı nesneler olarak",
      },
    },
    contents: {
      player:
        "Her oyuncunun yetenekleri, pozisyonları ve pozisyon puanları, 1–20 ölçeğinde özellikleri (gizliler dahil), " +
        "kişiliği, itibarı, milli maçları, sözleşmesi ve maddeleri; oyun tarihiyle birlikte. Paralar oyunun tuttuğu " +
        "gibi sterlin. Oyunda hiçbir şey değişmez.",
      staff:
        "Her personelin görevi ve kulübü, yetenekleri, 1–20 ölçeğinde özellikleri, kişiliği, itibarı ve sözleşmesi (maaş " +
        "ve tarihler); oyun tarihiyle birlikte. Paralar oyunun tuttuğu gibi sterlin. Oyunda hiçbir şey değişmez.",
      club:
        "Her kulübün ülkesi, ligi, itibarı, kuruluş yılı, kombine bilet sayısı, sosyal medya takipçileri, taraftar dağılımı ve " +
        "özellikleri, tesisleri, stadyumu ve mali durumu: bakiye, transfer bütçesi, haftalık maaş harcaması ile maaş " +
        "bütçesi ve bilet fiyatı; oyun tarihiyle birlikte. FM mali durumu yalnızca oynanan liglerdeki kulüpler için tutar. " +
        "Paralar oyunun tuttuğu gibi sterlin. Oyunda hiçbir şey değişmez.",
    },
    export: "Dışa aktar",
    exporting: "Dışa aktarılıyor…",
    done: (entity, count, file) => `${entityCount(entity, count)} ${file} dosyasına aktarıldı`,
    folder: (folder) => `Klasör: ${folder}`,
    skipped: (entity, count) => `${entityCount(entity, count)} okunurken oyunda değişti ve dışarıda bırakıldı.`,
    open: "Aç",
    openTitle: "Dosyayı sisteminizin onu açtığı uygulamada aç",
    show: "Klasörde göster",
    showTitle: "Dosyayı klasöründe göster",
    close: "Kapat",

    /** The export of the Changes view: a CSV file of the changes its search and filters show. */
    changes: {
      buttonTitle: "Listenin gösterdiği değişiklikleri CSV dosyasına yaz",
      title: "Değişiklikleri dışa aktar",
      /** What the export covers: everything the list's search and filters select, or, with none on, the whole history. */
      scope: (count, filtering) =>
        count === 0
          ? "Arama ve filtrelere uyan değişiklik yok."
          : filtering
            ? `${changes(count)}: arama ve filtrelerin seçtikleri, en yenisi başta.`
            : `${changes(count)}: bu kariyerin tüm geçmişi, en yenisi başta.`,
      contents:
        "Her değişikliğin saati (yerel saat, UTC'ye göre farkıyla), adı ve UID'si, alanı, eski ve yeni değeri " +
        "(oyunun sakladığı gibi ve burada gösterildiği gibi), listenin bunların altına yazdığı notlar, dahil olduğu " +
        "toplu düzenleme, geri alındıysa ne zaman alındığı, önceki bir oturumdan olup olmadığı ve oyunda olup " +
        "olmadığı. Oyunda hiçbir şey değişmez.",
      done: (count, file) => `${changes(count)} ${file} dosyasına aktarıldı`,
    },
  },

  massEdit: {
    button: "Toplu düzenleme",
    buttonTitle: "Listenin gösterdiği her şeyin değerlerini, önce önizleme yaparak değiştir",
    title: {
      player: "Oyuncuları toplu düzenle",
      staff: "Personeli toplu düzenle",
      club: "Kulüpleri toplu düzenle",
    } satisfies Record<Entity, string>,

    // What it applies to
    scope: (entity, total) => `Listenin şu an gösterdiği ${entityCount(entity, total)} (arama ve filtreler)`,
    scopeAll: (shown) => `Yalnızca ekrandaki ilk ${format(shown)} satır değil, eşleşen her kayıt kapsanır.`,
    scopeNone: (entity) =>
      `Aramaya ve filtrelere uyan ${nouns[entity].plain} yok, bu yüzden değiştirilecek bir şey yok.`,
    scopeTooMany: (entity, total, limit) =>
      `Listenin gösterdiği ${entityCount(entity, total)}, ` +
      `bir toplu düzenlemenin kaldırabileceğinden (${format(limit)}) fazla. ` +
      "Önce aramayı veya filtreleri daraltın.",
    loadingFields: "Alanlar okunuyor…",
    fieldsFailed: (reason) => `Alanlar okunamadı: ${reason}`,

    // The fields to change
    groups: {
      ability: "Yetenek",
      technical: "Teknik özellikler",
      mental: "Zihinsel özellikler",
      physical: "Fiziksel özellikler",
      goalkeeping: "Kalecilik özellikleri",
      hidden: "Gizli özellikler",
      feet: "Ayaklar",
      coaching: "Antrenörlük özellikleri",
      knowledge: "Bilgi özellikleri",
      medical: "Sağlık özellikleri",
      positions: "Pozisyonlar",
      personality: "Kişilik",
      reputation: "İtibar",
      international: "Milli takım",
      contract: "Sözleşme",
      facilities: "Tesisler",
      finances: "Finans",
      stadium: "Stadyum",
      traits: "Özellikler",
      health: "Sağlık",
      other: "Diğer",
    },
    fieldsLabel: "Değiştirilecek alanlar",
    row: (position) => `Değişiklik ${position}`,
    field: "Alan",
    operation: "İşlem",
    operations: { set: "Ayarla", add: "Ekle", scale: "Ölçekle (%)", addYears: "Yıl ekle" } satisfies Record<
      MassOperationKind["op"],
      string
    >,
    values: { set: "Değer", add: "Miktar", scale: "Yüzde", addYears: "Yıl" } satisfies Record<
      MassOperationKind["op"],
      string
    >,
    addTitle: "Her değere, gösterildiği gibi eklenir; negatif sayı çıkarır",
    addPointsTitle: "Her değere yüzde puanı olarak eklenir (%70 artı 10, %80 eder); negatif sayı çıkarır",
    rangeHint: (min, max) => `${format(min)}–${format(max)}`,
    amountHint: (max) => `±${format(max)}`,
    ofCurrent: "% (mevcut değerin)",
    percentTitle: "Mevcut değerin yüzdesi: 100 değeri korur, 110 onda bir artırır, 50 yarıya indirir",
    addYearsTitle: "Her tarihe eklenecek yıl sayısı; negatif sayı tarihi geri alır, 29 Şubat 28 Şubat olabilir",
    years: "yıl",
    invalidAdd: (min, max) => `${format(min)} ile ${format(max)} arasında bir tam sayı girin`,
    invalidPercent: (min, max) => `${min} ile ${max} arasında tam sayı bir yüzde girin`,
    invalidYears: (min: number, max: number) => `${format(min)} ile ${format(max)} arasında tam bir yıl sayısı girin`,
    dateSetOnly: "Tarih yalnızca ayarlanabilir ya da yıl eklenerek kaydırılabilir",
    yearsDateOnly: "Yalnızca tarihe yıl eklenebilir",
    addField: "Alan ekle",
    addFieldFull: (max) => `Bir toplu düzenleme en fazla ${max} alanı değiştirir`,
    remove: "Bu alanı kaldır",
    removeLast: "Bir toplu düzenleme için en az bir alan gerekir",

    // The preview
    preview: "Önizle",
    previewing: "Önizleniyor…",
    previewBlocked: "Önizlemek için her alanı geçerli bir değerle doldurun",
    // "237 oyuncunun 140 tanesi için 312 değişiklik · 97 oyuncuda bu değerler zaten var · 12 değere dokunulmadı";
    // with every target changed: "237 oyuncu için 312 değişiklik".
    summary: (entity: Entity, preview: MassPreview) => {
      const noun = nouns[entity];
      const affected = preview.targets - preview.unchanged;
      return [
        preview.changes === 0
          ? "Değişiklik yok"
          : affected === preview.targets
            ? `${format(preview.targets)} ${noun.plain} için ${changes(preview.changes)}`
            : `${format(preview.targets)} ${noun.of} ${format(affected)} tanesi için ${changes(preview.changes)}`,
        preview.unchanged > 0 && `${format(preview.unchanged)} ${noun.in} bu değerler zaten var`,
        preview.skippedCount > 0 && valuesLeftAlone(preview.skippedCount),
      ]
        .filter(Boolean)
        .join(" · ");
    },
    tableLabel: "Toplu düzenlemenin yapacağı değişiklikler",
    columns: { name: "İsim", field: "Alan", change: "Değişiklik", reason: "Neden" },
    more: (count) => `ve ${format(count)} tane daha`,
    skippedHeading: valuesLeftAlone,
    skippedLabel: "Toplu düzenlemenin dokunmadığı değerler",

    // Apply and undo
    apply: "Uygula",
    applying: "Uygulanıyor…",
    applyTitle: (count) => `Oyuna ${changes(count)} yaz`,
    applyFirst: "Önce toplu düzenlemeyi önizleyin",
    applyNothing: "Önizlemede yazılacak değişiklik yok",
    hint: "Siz uygulamadan oyunda hiçbir şey değişmez.",
    applied: (count) => (count === 0 ? "Hiçbir değişiklik yazılmadı" : `${changes(count)} uygulandı`),
    failure: (name, label, reason) => `${name} · ${label}: ${reason}`,
    undo: "Bu toplu düzenlemeyi geri al",
    undoing: "Geri alınıyor…",
    undoTitle: "Bu toplu düzenlemenin eski değerlerini oyuna geri yaz",
    undone: (count) => (count === 0 ? "Hiçbir şey geri alınmadı" : `${changes(count)} geri alındı`),
    undoFailure: (who, reason) => `${who}: ${reason}`,
    changeNumber: (id) => `Değişiklik ${id}`,
    close: "Kapat",
  },

  comparison: {
    compare: "Karşılaştır",
    add: "Karşılaştırmaya ekle",
    remove: "Karşılaştırmadan çıkar",
    full: (max) => `Karşılaştırma en fazla ${max} oyuncu alır. Bu oyuncuyu eklemek için birini çıkarın.`,

    // The tray under the player list
    trayLabel: "Karşılaştırılacak oyuncular",
    // The name stays as the game has it, so the ending is not put on it: "Karşılaştırmadan çıkar: …".
    removePlayer: (name) => `Karşılaştırmadan çıkar: ${name}`,
    clear: "Temizle",
    open: (count) => `Karşılaştır (${count})`,

    // The dialog
    title: "Karşılaştırma",
    hint:
      "Her satırdaki en iyi değer vurgulanır: en yüksek olan ya da " +
      "düşük değerin daha iyi olduğu satırlarda en düşük olan.",
    tooFew: "Karşılaştırmak için en az iki oyuncu ekleyin.",
    loading: "Oyuncular yükleniyor…",
    tableLabel: "Karşılaştırılan oyuncuların değerleri",
    highest: "en yüksek",
    lowest: "en düşük",
    profile: "Profil",
    close: "Kapat",
  },

  move: {
    button: "Transfer",
    buttonTitle: "Bu oyuncuyu oyunda başka bir kulübe transfer et; istersen bir bedelle",

    // The dialog
    title: "Transfer",
    from: "Mevcut kulüp",
    to: "Yeni kulüp",

    // The switch at the top of the dialog
    modeLabel: "Transfer, kiralık, şimdi taşı veya takas",
    modeMove: "Şimdi taşı",
    modeSwap: "Oyuncuyla takas et",
    modeArrange: "Transfer",
    arrangeNote:
      "Transferi oyun, kendi transferleri gibi oyundaki ertesi gün yapar: oyuncunun geçmişinde bu sezonki maçları " +
      "eski kulübünde kalır, yeni kulübü bonservis bedeliyle görünür ve bedeli oyun öder.",
    moveNote:
      "Düzenleyici oyuncuyu hemen taşır. Oyun bunu geçmişine transfer olarak yazmaz: bu sezon, maçlarıyla birlikte " +
      "yeni kulübün altında ve bedelsiz görünür.",
    arrangeUnavailable:
      "Düzenleyici, oyunun bu sürümünde ya da bu sistemde oyunun yapacağı bir transfer ayarlayamıyor: Şimdi taşı, " +
      "oyuncuyu hemen taşır.",
    arrangeChecking: "Transfer kontrol ediliyor… İlk seferde oyunun transferlerini bulmak birkaç saniye sürer.",
    movesOn: (date) => `Oyun transferi ${date} tarihinde yapar`,
    arrangeFee: (amount) => `Bonservis bedeli ${amount}, o gün oyun tarafından ödenir`,
    arrangeContract: (wage, expires) => `Sözleşme: haftalık ${wage}, ${expires} tarihine kadar`,
    arrangeDoes: [
      "Şimdi anlaşılır: oyun transferi, oyunda ertesi güne geçilince yapar",
      "Oyuncunun geçmişinde bu sezonki maçları eski kulübünde kalır, yeni kulübü bonservis bedeliyle görünür",
      "Bedeli oyun o gün öder, kendi transferlerinde olduğu gibi",
      "O günden itibaren yeni kulüple sözleşme; maaş ve sözleşme bitişi, yeni değer girilmedikçe aynı kalır",
      "Değişiklikler'de listelenir; o güne kadar tek bir geri alma transferi iptal eder",
    ],
    arrangeButton: "Transferi ayarla",

    modeLoan: "Kiralık",
    loanNote: "Oyun kiralığı, kendi kiralıkları gibi ertesi gün yapar; son günden sonra oyuncu kulübüne döner.",
    loanChecking: "Kiralık kontrol ediliyor…",
    loanOn: (date: string) => `Oyun kiralığı ${date} tarihinde yapar`,
    loanUntil: (date: string) => `Kiralık ${date} tarihine kadar sürer`,
    loanWage: (money: string, share: number) => `Kulüp haftalık ${money} öder (maaş payı %${format(share)})`,
    loanMonthlyFee: (money: string) => `Aylık bedel ${money}`,
    loanOption: (money: string) => `Satın alma opsiyonu: ${money}`,
    loanDoes: [
      "Şimdi anlaşıldı: oyun, ertesi güne ulaşınca kiralığı yapar",
      "Oyuncunun geçmişinde kiralık görünür; son günün ertesinde kendi kulübüne döner",
      "Kulüp maaşın payını öder; aylık bedel girdiyseniz onu da öder",
      "Opsiyon varsa, kiralık bitince katıldığı kulüp onu bu bedelle alabilir",
    ],
    loanDoesHeading: "Kiralık ne yapar",
    loanHint: "Siz Kiralığı ayarla'ya basmadan oyunda hiçbir şey değişmez.",
    loanButton: "Kiralığı ayarla",
    loanLastDay: "Kiralığın son günü",
    loanLastDayHint: "Ertesi gün kendi kulübüne döner",
    loanShare: "Ödenen maaş payı",
    loanShareHint: "Katıldığı kulüp öder, kalanını kendi kulübü öder",
    loanShareInvalid: "0 ile 100 arasında bir tam sayı girin",
    loanMonthly: "Aylık kiralık bedeli",
    loanOptionFee: "Satın alma opsiyonu",
    loanOptionFeeHint: "Kiralık bitince katıldığı kulüp onu bu bedelle alabilir; boşsa opsiyon yok",

    // Choosing the club
    searchLabel: "Transfer edileceği kulübü ara",
    resultsLabel: "Bulunan kulüpler",
    searching: "Kulüpler aranıyor…",
    searchFailed: (reason) => `Kulüpler aranamadı: ${reason}`,
    more: (count) => `ve ${format(count)} tane daha; aramayı daraltmak için yazın`,
    change: "Başka kulüp seç",

    // The fee
    feeHeading: "Bedel",
    fee: "Bonservis bedeli",
    feeHint: "Bedelsiz transfer için boş bırakın",
    feeInvalid: (max) => `0 ile ${max} arasında tam bir tutar girin`,
    pays: (club, fee, balance, budget) =>
      `${club} öder: ${fee}. Bakiye ${balance}${budget === null ? "" : `, transfer bütçesi ${budget}`}`,
    receives: (club, fee, balance) => `${club} alır: ${fee}. Bakiye ${balance}`,
    noFinances: (club) => `${club} için oyunda finans kaydı yok: parası değişmez`,

    // The contract
    wageInvalid: "0 veya daha büyük, tam bir tutar girin",
    expiresInvalid: "Bir tarih girin",

    // What the dialog says about the move itself
    chooseClub: "Oyuncunun transfer edileceği kulübü seçin.",
    fixTerms: "Önce bedeli ya da sözleşme değerlerini düzeltin.",
    checking: "Transfer kontrol ediliyor…",
    route: (from, to) => `${from} → ${to}`,
    doesHeading: "Transfer ne yapar",
    does: [
      "Yeni kulübün A takımına katılır",
      "Sözleşme oyundaki tarihle başlar; forma numarası silinir",
      "Transfer ve kiralık listelerinden çıkar",
      "Maaş ve sözleşme bitişi, siz yeni değer girmedikçe aynı kalır",
      "Bedel, alan kulübün bakiyesinden ve transfer bütçesinden düşer, satan kulübün bakiyesine eklenir",
      "Eski kulübündeki kaptanlığı boş kalır",
      "Oyunun transfer geçmişinde henüz görünmez",
      "Değişiklikler bölümünde listelenir; tek geri alma transferi ve bedeli birlikte geri alır",
    ],

    // A club whose squad list is full: the box that offers to make room. The names take no suffix, as elsewhere: a
    // foreign name's suffix follows how it is said ("Rice'ın"), which its spelling does not tell.
    noRoom: (club) => `${club} kadrosunda boş yer yok.`,
    noRoomInfoLabel: "Neden?",
    noRoomInfo:
      "Editör dolu kadro listesini yapabildiği yerde büyütür, ama bu listeyi büyütemez: yer açmak için bir " +
      "oyuncunun ayrılması gerekir.",
    noRoomNeed: (player) => `${player} transferi için kadrodan bir oyuncunun ayrılması gerekiyor.`,
    releaseChoice: "Serbest bırak:",
    releasePickLabel: "Serbest bırakılacak oyuncu",
    releaseOutcome: "→ kulüpsüz kalır",
    injuredTag: "sakat",
    captainTag: "kaptan",
    swapChoice: "Takasa çevir:",
    swapChoiceOutcome: (club) => `bu oyuncu ${club} kulübüne gelsin`,
    moveAndRelease: (name) => `Transfer et ve serbest bırak: ${name}`,
    makeRoomDoes: [
      "Yeni kulübün A takımına, serbest bırakılan oyuncunun yerine katılır",
      "Serbest bırakılan oyuncu o kulübün bütün takımlarından ayrılır, sözleşmesi biter: serbest oyuncu olur",
      "Sözleşme oyundaki tarihle başlar; forma numarası silinir",
      "Transfer ve kiralık listelerinden çıkar",
      "Maaş ve sözleşme bitişi, siz yeni değer girmedikçe aynı kalır",
      "Bedel, alan kulübün bakiyesinden ve transfer bütçesinden düşer, satan kulübün bakiyesine eklenir",
      "İkisinin de ayrıldığı kulüpteki kaptanlığı boş kalır",
      "Oyunun transfer geçmişinde henüz görünmez",
      "Değişiklikler bölümünde tek değişiklik olarak listelenir; tek geri alma transferi, serbest bırakmayı ve bedeli birlikte geri alır",
    ],

    // Swapping with a player of the club instead
    swapTitle: "Oyuncuyla takas et",
    swapWith: "Takas edilecek oyuncu",
    playerSearchLabel: "Takas edilecek oyuncuyu ara",
    playerSearch: "Bu kulübün oyuncularını isimle ara",
    playersLabel: "Bulunan oyuncular",
    playersSearching: "Oyuncular aranıyor…",
    playersSearchFailed: (reason) => `Oyuncular aranamadı: ${reason}`,
    playersEmpty: (query) =>
      query === "" ? "Bu kulübün oyuncusu yok." : `Bu kulüpte “${query}” aramasına uyan oyuncu yok.`,
    changePlayer: "Başka oyuncu seç",

    // What the dialog says about the swap
    swapContract: "Her oyuncu kendi sözleşmesini korur; maaşlar ve sözleşme bitişleri değişmez.",
    staffButtonTitle: "Bu personeli oyunda başka bir kulübe taşı",
    staffChooseClub: "Personelin taşınacağı kulübü seçin.",
    staffContract: "Görevi, maaşı ve sözleşme bitişi aynı kalır; sözleşme oyundaki tarihle başlar.",
    staffJob: "Görev",
    staffJobChoose: "Görev seçin…",
    staffJobKept: (job) => `${job} (aynı kalır)`,
    staffNewJob: "Yeni görevi alır; maaşı ve sözleşme bitişi aynı kalır, sözleşme oyundaki tarihle başlar.",
    staffDoes: [
      "Yeni kulübe görevinin olduğu yerde katılır: sağlık, antrenörlük ya da gözlem bölümüne veya futbol direktörü " +
        "ya da teknik direktör olarak (bunlardan birine sahip kulüp ikincisini almaz)",
      "Maaşı ve sözleşme bitişi aynı kalır; sözleşme oyundaki tarihle başlar",
      "Ayrılan teknik direktörün takımdaki yeri, kulüp doldursun diye boş kalır; yönetim oyuna bırakılır",
      "Değişiklikler bölümünde listelenir ve oradan geri alınabilir",
    ],
    staffSignButtonTitle: "Kulübü olmayan bu personeli oyunda bir kulübe imzalat",
    staffSignTitle: "Personel imzalat",
    staffSignChooseClub: "Personelin imzalayacağı kulübü seçin.",
    staffSignChooseJob: "Kulüpte alacağı görevi seçin.",
    staffSignTerms:
      "Boş bırakırsanız maaş, kulüpte görevi ona en çok benzeyen personelinki olur; sözleşme gelecek sezonun sonuna " +
      "kadar sürer.",
    staffSignRoute: (to) => `Kulübü yok → ${to}`,
    staffSignContract: (wage, expires) => `Yeni sözleşme: haftalık ${wage}, ${expires} tarihine kadar`,
    staffSignDoes: [
      "Kulübe görevinin olduğu yerde katılır: bölümüne (liste doluysa büyütülür) ya da kulübün futbol direktörü veya " +
        "teknik direktörü yoksa onun yerine",
      "Oyunun kendi boş sözleşme yerlerinden birinde, oyunun yaptığı gibi, oyundaki tarihle başlayan yeni bir sözleşme",
      "Kulübün aynı görevdeki (yoksa aynı bölümdeki, o da yoksa herhangi bir), yeteneği ona en yakın personelinin " +
        "sözleşmesi örnek alınır",
      "Sizin maaşınız ve bitiş tarihiniz ya da o sözleşmenin maaşı ve gelecek sezonun sonu; madde ya da prim yok",
      "Değişiklikler bölümünde listelenir; tek geri alma hepsini geri alır",
    ],
    swapChooseClub: "Takas edilecek oyuncunun kulübünü seçin.",
    swapChoosePlayer: "Takas edilecek oyuncuyu seçin.",
    swapChecking: "Takas kontrol ediliyor…",
    swapRoute: (player, from, to, other) => `${player}: ${from} → ${to}\n${other}: ${to} → ${from}`,
    swapDoesHeading: "Takas işlemi ne yapar",
    swapDoes: [
      "İkisi de diğerinin kulübünün A takımına katılır",
      "Sözleşmeler oyundaki tarihle başlar; forma numaraları silinir",
      "İkisi de transfer ve kiralık listelerinden çıkar",
      "Eski kulüplerindeki kaptanlıkları boş kalır",
      "Bedel ödenmez; kariyer geçmişi güncellenmez",
      "Değişiklikler bölümünde tek değişiklik olarak listelenir; geri alınırsa ikisi de eski kulübüne döner",
    ],

    // Signing a free agent
    signButtonTitle: "Bu serbest oyuncuyu oyunda bir kulüple sözleşme imzalat",
    signTitle: "Serbest oyuncuyla sözleşme",
    signChooseClub: "Oyuncunun imza atacağı kulübü seçin.",
    signChecking: "İmza kontrol ediliyor…",
    signTerms:
      "Boş bırakırsanız maaş, kulüpte yeteneği ona en yakın oyuncunun maaşı olur; sözleşme gelecek sezonun sonuna " +
      "kadar sürer.",
    signRoute: (to) => `Serbest oyuncu → ${to}`,
    signContract: (wage, expires, status) => `Yeni sözleşme: haftalık ${wage}, ${expires} tarihine kadar, ${status}`,
    signDoesHeading: "İmza ne yapar",
    signDoes: [
      "Kulübün A takımına katılır; kadro listesi doluysa büyütülür",
      "Oyundaki tarihle başlayan yeni bir sözleşme, oyunun kendi boş sözleşme yuvalarından birinde, oyunun yaptığı gibi",
      "Sözleşme, kulüpte yeteneği ona en yakın oyuncununkini örnek alır: aynı sözleşme türü ve aynı forma süresi",
      "Sizin girdiğiniz maaş ve bitiş tarihi; boşsa o oyuncunun maaşı ve gelecek sezonun sonu",
      "Forma numarası, sadakat primi, madde ve prim yok",
      "Oyunun transfer geçmişinde henüz görünmez",
      "Değişiklikler bölümünde listelenir; tek geri alma hepsini geri alır",
    ],
    signHint: "Siz imzalatmadan oyunda hiçbir şey değişmez.",
    sign: "İmzalat",
    signing: "İmzalatılıyor…",

    // The foot
    hint: "Siz transfer etmeden oyunda hiçbir şey değişmez.",
    arrangeHint: "Siz Transferi ayarla'ya basmadan oyunda hiçbir şey değişmez.",
    moveNowHint: "Siz Şimdi taşı'ya basmadan oyunda hiçbir şey değişmez.",
    move: "Transfer et",
    moving: "Transfer ediliyor…",
    cancel: "İptal",
    swapHint: "Siz takas etmeden oyunda hiçbir şey değişmez.",
    swap: "Takas et",
    swapping: "Takas ediliyor…",
  },

  ties: {
    heading: "Uyruk ve yetiştiği yer",
    nationalities: "İkinci uyruklar",
    trainedInNation: "Yetiştiği ülke",
    trainedAtClub: "Yetiştiği kulüp",
    workPermit: "Çalışma izni gerekmeyen ülke",
    none: "Yok",
    rules: {
      1: "Yerli 15-21",
      2: "Yerli 0-21",
      5: "Yerli 15-21 (kiralıklar hariç)",
      10: "Yerli 0-19 (1 yıl)",
    },
    rule: (code) => `Yerli kuralı ${format(code)}`,

    // The button under the group, and the dialog it opens
    change: "Değiştir",
    changeTitle: "Bu oyuncunun ikinci uyruklarını ve yerli statüsünü oyunda değiştir",
    title: "Uyruk ve yetiştiği yer",
    hint: "Her değişiklik oyuna hemen yazılır ve Değişiklikler bölümünde listelenir; oradan geri alınabilir.",
    full:
      "Oyun bu oyuncunun listesini, tuttuğu kayıtlar kadar ayırmış: bir uyruk ya da yetiştiği yer değiştirilebilir " +
      "veya kaldırılabilir, ama yenisi eklenemez.",
    nationOf: (name) => `${name} yerine ülke`,
    ruleOf: (name) => `${name} için yerli kuralı`,
    remove: "Kaldır",
    removeTitle: (name) => `${name} kaydını kaldır`,
    addNationality: "Uyruk ekle…",
    addNation: "Ülke ekle…",
    addPermit: "İzin gerekmeyen ülke ekle…",
    daysLeft: (days) => `${format(days)} gün kaldı`,
    permitInfoLabel: "Bu ne işe yarar?",
    permitInfo:
      "Oyun, Brexit'ten önce İngiltere ya da İskoçya'da bulunan Avrupa Birliği oyuncularının orada belli bir süre " +
      "çalışma izni olmadan oynamasına izin verir. Bunu verdiğiniz oyuncunun da o ülkede oynamak için çalışma iznine " +
      "ihtiyacı olmaz; süresi o oyuncularınkiyle aynı gün dolar (kayıtta kimsede yoksa on yıl).",
    newRule: "Yeni ülkenin yerli kuralı",
    add: "Ekle",
    changeClub: "Kulübü değiştir",
    changeClubTitle: (name) => `${name} yerine başka bir kulüpte yetişmiş olsun`,
    clubInsteadOf: (name) => `${name} yerine kulüp`,
    addClub: "Kulüp ekle…",
    addClubTitle: "Bir kulüpte daha yetişmiş olsun",
    newClub: "Yeni kulüp",
    pickAnother: "Başkasını seç",
    newClubRule: "Yeni kulübün yerli kuralı",
    cancel: "Vazgeç",
    working: "Oyuna yazılıyor…",
    close: "Kapat",
  },

  clauses: {
    change: "Değiştir",
    changeTitle: "Bu oyuncunun primlerini ve sözleşme maddelerini oyunda değiştir",
    title: "Primler ve maddeler",
    hint: "Her değişiklik oyuna hemen yazılır ve Değişiklikler bölümünde listelenir; oradan geri alınabilir.",
    full:
      "Oyun bu sözleşmenin listesini, tuttuğu kayıtlar kadar ayırmış: bir prim ya da madde değiştirilebilir veya " +
      "kaldırılabilir, ama serbest kalma maddesi eklenemez.",
    amountOf: (name) => `${name} tutarı`,
    conditionOf: (name) => `${name} koşulu`,
    save: "Kaydet",
    remove: "Kaldır",
    removeTitle: (name) => `${name} kaldır`,
    addRelease: "Serbest kalma maddesi ekle",
    releaseAmount: "Yeni serbest kalma maddesinin tutarı",
    add: "Ekle",
    outOfRange: (max) => `0 ile ${max} arasında bir tam sayı girin.`,
    working: "Oyuna yazılıyor…",
    close: "Kapat",
  },

  release: {
    button: "Serbest bırak",
    buttonTitle: "Bu oyuncuyu oyunda kulübünden serbest bırak: serbest oyuncu olur",
    staffButtonTitle: "Bu personeli oyunda kulübünden serbest bırak: kulüpsüz kalır",

    // The dialog
    title: "Serbest bırak",
    from: "Ayrıldığı kulüp",
    checking: "Serbest bırakma kontrol ediliyor…",
    ready: (club) => `${club} → serbest oyuncu`,
    staffReady: (club) => `${club} → işsiz`,
    doesHeading: "Serbest bırakma ne yapar",
    does: [
      "Kulübün bütün takımlarından çıkar ve sözleşmesi sona erer: her kulübün alabileceği serbest oyuncu olur",
      "Kimseye ödeme yapılmaz",
      "Kulüpteki kaptanlığı boş kalır",
      "Oyunun transfer geçmişinde görünmez",
      "Değişiklikler bölümünde listelenir; tek geri alma oyuncuyu aynı sözleşmeyle geri getirir",
    ],
    staffDoes: [
      "Kulübün personelinden hemen ayrılır ve sözleşmesi sona erer: oyunun kendi kulüpsüz personeli gibi işsiz kalır",
      "Kimseye ödeme yapılmaz",
      "Teknik direktörlük ya da futbol direktörlüğü yeri, kulüp doldursun diye boş kalır",
      "Değişiklikler bölümünde listelenir; tek geri alma onu aynı sözleşmeyle geri getirir",
    ],

    // The foot
    hint: "Siz serbest bırakmadan oyunda hiçbir şey değişmez.",
    release: "Serbest bırak",
    releasing: "Serbest bırakılıyor…",
    cancel: "İptal",
  },

  rename: {
    button: "Yeniden adlandır",
    buttonTitle: "Bu oyuncunun adlarını oyunda değiştir",

    // The dialog
    title: "Yeniden adlandır",
    loading: "Adlar okunuyor…",
    first: "Ad",
    last: "Soyad",
    common: "Bilinen ad",
    commonHint:
      "Oyunun ad ve soyad yerine gösterdiği isim (Pedri ya da Vinícius Júnior gibi). Yoksa boş bırakın",
    full: "Tam isim",
    fullHint: "Profilde yazan tam isim. Yoksa boş bırakın",
    none: "Yok",
    required: "Boş bırakılamaz",
    tooLong: (max: number) => `Çok uzun: en fazla ${max} bayt`,
    noRoom:
      "Oyunda şu an bu türden yeni bir ad için yer yok: oyunu kaydedin, kaydı yeniden yükleyin ve tekrar deneyin",
    unavailable: "Editör oyunun bu sürümünde adları değiştiremiyor",
    doesHeading: "Yeniden adlandırma ne yapar",
    does: [
      "Oyun yeni adı, oyunda Devam'a bastığınızda gösterir",
      "Oyunu kaydettiğinizde yeni ad kayıtta kalır",
      "Yeni bir ad, soyad ya da bilinen ad oyunun ad tablolarına girer; oyun onu yalnızca bu oyuncu için kullanır",
      "Değişiklikler bölümünde her ad ayrı bir satırda listelenir; Geri al eski adı geri getirir",
    ],

    // The foot
    hint: "Siz Yeniden adlandır'a basmadan oyunda hiçbir şey değişmez.",
    rename: "Yeniden adlandır",
    renaming: "Yeniden adlandırılıyor…",
    cancel: "İptal",
  },

  permanent: {
    title: "Kiralığı kalıcı yap",
    stays: "Kalacağı kulüp",
    leaves: "Ayrılacağı kulüp",
    checking: "Kontrol ediliyor…",
    doesHeading: "Ne yapar",
    does: [
      "Oyuncu oynadığı kulüpte kalır; sözleşmesi bugünden başlayarak bu kulüple ve yukarıdaki şartlarla olur",
      "Oradaki forma numarası ve forma süresi korunur",
      "Kendi kulübünün bütün takımlarından çıkar ve kiralık sona erer",
      "Oyunun transfer geçmişinde görünmez",
      "Değişiklikler bölümünde transfer olarak listelenir; tek geri alma kiralığı geri getirir",
    ],
    optionFee: (money) => `Kiralığın satın alma opsiyonundan dolduruldu: ${money}`,
    hint: "Siz kalıcı yapmadan oyunda hiçbir şey değişmez.",
    confirm: "Kalıcı yap",
    confirming: "Kalıcı yapılıyor…",
    cancel: "İptal",
  },

  recall: {
    title: "Kiralıktan geri çağır",
    from: "Kiralık olduğu kulüp",
    to: "Döneceği kulüp",
    doesHeading: "Geri çağırma ne yapar",
    does: (parent) => [
      "Kiralığın son günü bugün olur: gün bitince oyun kiralığı kendisi sona erdirir",
      `Oyunda bir gün devam ettiğinizde oyuncu ${parent} kulübüne dönmüş olur`,
      "O zamana kadar Değişiklikler bölümünde listelenir; geri alma kiralığın eski bitiş tarihini geri getirir",
    ],
    termsHeading: "Oyunda",
    notRecallable: (parent) => `Kiralık sözleşmesi ${parent} kulübünün onu geri çağırmasına izin vermiyor`,
    notTerminable: "Kiralık erken bitirilemiyor",
    worksAnyway: "Buradaki geri çağırma yine de çalışır: oyunun geri çağırmasını kullanmaz, kiralığın son gününü değiştirir",
    dropsOption: (club, amount) =>
      `${club} kulübünün onu ${amount} karşılığında alma opsiyonu kaldırılır; yoksa kiralık bitince oyun onu ${club} kulübüne satabilir`,
    hint: "Siz geri çağırmadan oyunda hiçbir şey değişmez.",
    confirm: "Geri çağır",
    confirming: "Geri çağrılıyor…",
    cancel: "İptal",
  },

  batchTraits: {
    title: "Takım özellikleri",
    addMode: "+ Kadroya ekle",
    removeMode: "- Kadrodan kaldır",
    addHint: "Seçilen özellikleri bu takımda henüz sahip olmayan oyunculara ekler. Mevcut özellikler korunur.",
    removeHint: "Seçilen özellikleri bu takımda sahip olan oyunculardan kaldırır. Diğer özelliklere dokunulmaz.",
    noneSelected: "Bu modda özellik seçilmedi",
    selectedCount: (count: number) => `${format(count)} özellik seçildi`,
    deselectAll: "Seçimi temizle",
    oppositeModeNote: "Diğer modda seçildi",
    applyNote: (players: number) => `${format(players)} oyuncuya uygulanacak · 1 tıkla geri alınabilir`,
    emptySquad: (players: number) => `${format(players)} oyunculu kadro`,
    cancel: "İptal",
    apply: "Uygula",
    applying: "Uygulanıyor…",
  },

  squad: {
    // The switch between the club's teams
    teamsLabel: "Takım",
    // The first team is the A team; the others are told apart by their age limit, or by their place in the club's list.
    teams: {
      first: "A takımı",
      b: "B takımı",
      age: (limit) => `U${limit}`,
      other: (place) => `Takım ${place}`,
    },
    noTeams: "Bu kulübün takımı yok.",
    loading: "Kadro okunuyor…",
    empty: "Bu takımda oyuncu yok.",

    // Above the table
    players: (count) => `${format(count)} oyuncu`,
    averageAge: (age) => `yaş ortalaması ${age}`,
    captains: (captain, viceCaptain) => `Kaptan: ${captain} · Yardımcı kaptan: ${viceCaptain}`,

    // The actions on the whole team
    actionsLabel: "Takımın tamamına yönelik işlemler",
    healAll: (injured) => (injured === 0 ? "Hepsini iyileştir" : `Hepsini iyileştir (${format(injured)} sakat)`),
    healAllTitle: "Bu takımdaki her oyuncunun tüm sakatlıklarını iyileştir",
    healNone: "Bu takımda sakat oyuncu yok",
    liftAll: (banned) => (banned === 0 ? "Cezaları kaldır" : `Cezaları kaldır (${format(banned)} cezalı)`),
    liftAllTitle: "Bu takımdaki her oyuncunun tüm cezalarını kaldır",
    liftNone: "Bu takımda cezalı oyuncu yok",
    inspireAll: "Hepsine moral ver",
    inspireAllTitle: "Her oyuncunun moralini en yüksek değer olan 20'ye ayarla; mutsuzluk nedenlerini de kaldır",
    maxCohesion: "Uyumu tamamla",
    maxCohesionTitle: "Her oyuncunun kulüple uyumunu en yüksek değer olan 100'e ayarla; oyun bunu ilerleyince gösterir",
    cohesionNone:
      "Okunamıyor: oyunun bu sürümü bunun için kontrol edilmedi ya da oyuncuların hiçbirinin kulüple uyumu yok",
    cohesionWithout: (count: number) => `${format(count)} oyuncunun henüz kulüple uyumu yok`,
    maxTactics: "Taktiği tamamla",
    maxTacticsTitle:
      "Her oyuncunun takımın taktiğini en iyi şekilde bilmesini sağla; antrenman gibi, altı hafta kadar sonra düşer",
    tacticsNone:
      "Okunamıyor: oyunun bu sürümü bunun için kontrol edilmedi ya da takım senin seçtiğin bir taktiği oynamıyor",
    tacticsUntrained: (count: number) =>
      `${format(count)} oyuncu antrenman yapmıyor (örneğin sakat olduğu için): antrenman geçmişi olduğu gibi kalıyor`,
    refreshAll: "Hepsini dinlendir",
    refreshAllTitle:
      "Her oyuncunun enerjisini ve maç kondisyonunu %100'e ayarla, onları tamamen dinlendir (yorgunluk -500)",
    batchTraits: "Kadro özellikleri",
    batchTraitsTitle: "Bu takımdaki oyuncular için tercih edilen hareketleri ekle veya kaldır",
    maxAll: "Özellikleri tamamla",
    maxAllTitle: "Her oyuncunun bütün özelliklerini en iyiye çıkar: 20; sakatlık eğilimi ve sertlik için 1",
    atItsBest: "Takımı en iyi hâline getir",
    atItsBestTitle:
      "Tek tıklamayla iyileştirir, moral verir, dinlendirir, uyumu ve taktiği tamamlar; tek “Geri al” hepsini geri alır",
    atItsBestSkipped: (step, reason) => `“${step}” atlandı: ${reason}`,
    destroy: "Takımı en kötü hâline getir",
    destroyTitle: "Her oyuncunun moralini, kondisyonunu, uyumunu ve taktik bilgisini en kötü hâline getir; önce sorar",
    destroySteps: {
      demoralize: "Moral ve mutluluk",
      exhaust: "Enerji ve maç kondisyonu",
      minCohesion: "Uyum",
      minTactics: "Taktik",
    },
    moreActions: "Diğer işlemler",
    moreActionsTitle: "Takımın tamamına yönelik işlemler, tek tek",
    destroyDialog: {
      title: "Takım en kötü hâline getirilsin mi?",
      doesHeading: "Listedeki her oyuncu için, kiralık gönderilenler de dahil",
      does: [
        "Moral en düşük değer olan 1'e; mutluluk ve forma süresi mutluluğu -100'e",
        "Enerji %0'a, maç kondisyonu %35'e, yorgunluk 1000'e",
        "Kulüple uyum 1'e (uyumu olanlarda)",
        "Taktik bilgisi en düşüğe (takımın taktiğini sen seçiyorsan)",
      ],
      keeps: "Hiçbir değer olduğundan iyi yapılmaz. Özellikler, sakatlıklar ve cezalar olduğu gibi kalır.",
      ownClub: "Bu, kendi kulübünün takımı.",
      hint: "Oyun ilerlemeden önce tek bir “Geri al” hepsini geri alır.",
      cancel: "İptal",
    },
    hint:
      "İşlemler listedeki her oyuncuyu kapsar, kiralık gönderilenler de dahil. " +
      "Geri alma işlemi Değişiklikler bölümünde de yapılabilir.",

    // Freezing the whole team
    freezeLabel: "Tüm takımı dondur",
    freezeAttributes: "Özellikleri dondur",
    freezeAttributesTitle: "Uygulama açık ve oyuna bağlıyken bu takımdaki her oyuncunun özellikleri düşmez",
    freezeFitness: "Enerji ve maç kondisyonunu dondur",
    freezeFitnessTitle:
      "Uygulama bağlıyken her oyuncunun enerjisi ve maç kondisyonu düşmez; %100 için önce Hepsini dinlendir'e basın",
    freezePositions: "Pozisyonları dondur",
    freezePositionsTitle:
      "Uygulama açık ve oyuna bağlıyken bu takımdaki her oyuncunun pozisyon puanları olduğu gibi kalır",
    // "5 / 26": no ending to put on a figure.
    frozenCount: (frozen, total) => `${format(frozen)} / ${format(total)}`,
    freezeHint:
      "Dondurma listedeki her oyuncuyu kapsar ve oyuncu nereye giderse gitsin onunla kalır. Uygulama bunu bu kayıt " +
      "için hatırlar.",
    frozeAttributes: (count) =>
      count === 0 ? "Özellikleri zaten donduruluydu" : `${format(count)} oyuncunun özellikleri donduruldu`,
    unfrozeAttributes: (count) => `${format(count)} oyuncunun özelliklerindeki dondurma kaldırıldı`,
    frozeFitness: (count) =>
      count === 0
        ? "Enerji ve maç kondisyonu zaten donduruluydu"
        : `${format(count)} oyuncunun enerjisi ve maç kondisyonu donduruldu`,
    unfrozeFitness: (count) => `${format(count)} oyuncunun enerjisindeki ve maç kondisyonundaki dondurma kaldırıldı`,
    frozePositions: (count) =>
      count === 0 ? "Pozisyonları zaten donduruluydu" : `${format(count)} oyuncunun pozisyonları donduruldu`,
    unfrozePositions: (count) => `${format(count)} oyuncunun pozisyonlarındaki dondurma kaldırıldı`,

    // What an action did, under the buttons
    written: (count) => (count === 0 ? "Hiçbir değişiklik yazılmadı" : `${changes(count)} yazıldı`),
    refused: (name, reason) => `${name}: ${reason}`,
    undo: "Geri al",
    undoTitle: "Bu değişikliklerin eski değerlerini oyuna geri yaz",

    // Captains
    captainShort: "K",
    viceCaptainShort: "YK",
    menuLabel: (name) => `Kaptanlık: ${name}`,
    menuTitle: "Kaptanlık",
    makeCaptain: "Kaptan yap",
    makeViceCaptain: "Yardımcı kaptan yap",
    nowCaptain: (name) => `${name} artık kaptan`,
    nowViceCaptain: (name) => `${name} artık yardımcı kaptan`,
    noCaptain: "Artık kaptan yok",
    noViceCaptain: "Artık yardımcı kaptan yok",

    // The table
    tableLabel: (team) => `Oyuncular: ${team}`,
    openProfile: "Oyuncunun profilini aç",
    columns: {
      name: "İsim",
      position: "Poz",
      age: "Yaş",
      currentAbility: "MY",
      potentialAbility: "PY",
      condition: "Enerji",
      matchSharpness: "Maç kond.",
      jadedness: "Yorgunluk",
      morale: "Moral",
      cohesion: "Uyum",
      tactics: "Taktik",
      actions: "Kaptanlık",
    } satisfies Record<SquadSort | "actions", string>,
    sortBy: (by) => `Sırala: ${by}`,
    // Said as "Sırala: …", so they stand as plain nouns.
    sortNames: {
      name: "isim",
      position: "pozisyon",
      age: "yaş",
      currentAbility: "mevcut yetenek",
      potentialAbility: "potansiyel yetenek",
      condition: "enerji",
      matchSharpness: "maç kondisyonu",
      jadedness: "yorgunluk",
      morale: "moral",
      cohesion: "uyum",
      tactics: "taktik aşinalığı",
    } satisfies Record<SquadSort, string>,

    // The tags after a name
    injured: "Sakat",
    injuredTitle: (count) => `${format(count)} sakatlık`,
    banned: "Cezalı",
    bannedTitle: (count) => `${format(count)} ceza`,
    unrest: "Huzursuzluk",
    unrestTitle: (count) =>
      count === 1
        ? "1 takım arkadaşı onun yüzünden mutsuz; profilindeki Hepsini kaldır, oyun ilerleyince bunu çözer"
        : `${format(count)} takım arkadaşı onun yüzünden mutsuz; profilindeki Hepsini kaldır, oyun ilerleyince bunu çözer`,
    onLoan: "Kirada",
    onLoanTitle: "Başka bir kulübe kiralık gönderildi",
    loanee: "Kiralık",
    loaneeTitle: "Başka bir kulüpten kiralık geldi",
    elsewhere: "Başka takımda",
    elsewhereTitle: "Kulübün başka bir takımında oynuyor",
    frozen: "Donduruldu",
    frozenTitle: (attributes, fitness, positions) => {
      const frozen = [
        ...(attributes ? ["özellikleri"] : []),
        ...(fitness ? ["enerjisi", "maç kondisyonu"] : []),
        ...(positions ? ["pozisyonları"] : []),
      ];
      const last = frozen.pop() ?? "";
      const listed = frozen.length > 0 ? `${frozen.join(", ")} ve ${last}` : last;
      return `${listed.charAt(0).toLocaleUpperCase("tr")}${listed.slice(1)} donduruldu`;
    },
  },

  game: {
    name: "Football Manager",
    storefronts: {
      gamePass: "Game Pass",
      steam: "Steam",
      epic: "Epic Games",
      unknown: "Bilinmeyen mağaza",
    } satisfies Record<Storefront, string>,
    steamBuild: (id) => `derleme ${id}`,
  },

  scouting: {
    nav: "Gözlem",
    reading: "Kulübünüz okunuyor…",
    refresh: "Yenile",
    refreshTitle: "Kulübü oyundan yeniden oku",
    searching: "Aranıyor…",
    none: "—",
    perWeek: "/hf",
    openProfile: "Profili aç",
    freeAgent: "Serbest oyuncu",
    loan: "Kiralık",
    header: {
      transferBudget: "Transfer bütçesi",
      wageRoom: "Maaş payı",
      wageBudget: "Maaş bütçesi",
      squad: "Kadro",
      averageAge: "Yaş ortalaması",
      players: (count) => `${format(count)} oyuncu`,
    },
    tabs: {
      label: "Gözlem bölümleri",
      recommend: "Transfer önerileri",
      opportunities: "Fırsatlar",
      similar: "Benzer oyuncular",
      depth: "Kadro derinliği",
      departures: "Gönderilebilecekler",
      youth: "Altyapı alımı",
    },
    status: {
      missing: "Eksik",
      thin: "Az",
      fine: "Yeterli",
      crowded: "Yığılma",
    },
    lines: {
      goalkeeper: "Kaleci",
      centreBack: "Stoper",
      fullBack: "Bek",
      wingBack: "Kanat bek",
      defensiveMidfield: "Ön libero",
      centralMidfield: "Orta saha",
      attackingMidfield: "Ofansif orta saha",
      wide: "Kanat",
      striker: "Forvet",
    },
    depthLines: {
      gk: "Kaleciler",
      dc: "Stoperler",
      rightBack: "Sağ bekler",
      leftBack: "Sol bekler",
      dm: "Ön liberolar",
      mc: "Merkez orta sahalar",
      rightWing: "Sağ kanatlar",
      leftWing: "Sol kanatlar",
      amc: "Ofansif orta sahalar",
      st: "Forvetler",
    },
    positionTip: (line, count, target, status) =>
      `${line}: kadroda ${format(count)} (genelde ${format(target)}) — ${status}`,
    brief: {
      heading: "Ne arıyorsun?",
      pitch: "Mevki",
      legend: "Noktalar, kadronun her mevkideki durumunu gösterir.",
      inPossession: "Top bizdeyken",
      outOfPossession: "Top rakipteyken",
      anyRole: "Fark etmez — her oyuncu için en uygun rol",
      purpose: "Amaç",
      filters: "Filtreler",
      minAge: "En düşük yaş",
      maxAge: "En yüksek yaş",
      maxFee: "En yüksek bonservis",
      minProbability: "Olasılık",
      anyProbability: "Fark etmez",
      noFreeAgents: "Serbest oyuncuları gösterme",
    },
    purposes: {
      firstTeam: "İlk 11",
      rotation: "Rotasyon",
      future: "Gelecek",
      any: "Hepsi",
    },
    purposeTips: {
      firstTeam: "Bu mevkideki en iyi oyuncundan daha iyi",
      rotation: "İkinci tercihin kadar iyi, makul bir bedelle",
      future: "21 yaş ve altı, gelişmeye açık",
      any: "Uyan herkes",
    },
    ask: {
      before: "",
      after: " için transfer önerileri",
      anyRole: "her oyuncu için en uygun rol",
    },
    own: {
      heading: "Kadrondaki seçenekler",
      empty: "Kadronda bu mevkide oynayabilecek oyuncu yok.",
      position: "Mevki",
    },
    summary: (candidates, eligible, shown, purpose) =>
      `${format(candidates)} oyuncu bu mevkide oynayabiliyor · ${purpose} hedefine uyan: ${format(eligible)} · ${format(shown)} öneri`,
    how: {
      label: "Bu liste nasıl oluşuyor?",
      note: (rule, count) =>
        `Bu mevkide puanı 10 ve üstü olan (senin ve diğer insan menajerlerin oyuncuları hariç), ${rule} oyuncular. Uyum (%70) ve olasılığa (%30) göre en iyi ${count} oyuncu gösterilir; Rotasyon ikisini eşit tartar, Gelecek potansiyeli de sayar. Sıralamak için bir sütun başlığına tıkla.`,
    },
    purposeRules: {
      firstTeam: "bu mevkide en iyi oyuncundan daha uygun olan",
      rotation: "en az ikinci tercihin kadar uygun olan",
      future: "21 yaş ve altı, gelişmeye açık (potansiyeli yeteneğinden en az 15 fazla) olan",
      any: "uyan tüm",
    },
    sortBy: (by) => `Sırala: ${by}`,
    sortNames: {
      rank: "gözlemcinin sırası",
      name: "isim",
      age: "yaş",
      ca: "mevcut yetenek",
      pa: "potansiyel yetenek",
      fit: "uyum",
      probability: "olasılık",
      fee: "bonservis",
      similarity: "benzerlik",
    },
    backToScoutOrder: "Gözlemcinin sırasına dön",
    showMore: (count) => `${format(count)} öneri daha göster`,
    playsFor: (club) => `${club} takımında oynuyor`,
    empty: "Bu mevki ve ayarlarla öneri yok. Hedefi Hepsi yapmayı ya da filtreleri gevşetmeyi dene.",
    columns: {
      rank: "#",
      ca: "MY",
      pa: "PY",
      player: "Oyuncu",
      age: "Yaş",
      fit: "Uyum",
      role: "Rol",
      probability: "Olasılık",
      fee: "Tahmini bonservis",
      wage: "Maaş",
      note: "Gözlemci notu",
      money: "Bonservis",
      value: "Değer",
    },
    probabilityInfo:
      "Oyuncunun takımınıza transfer olma ihtimali — değeri, sözleşmesi, kulübü ve itibarından yapılan bir tahmin.",
    probabilityInfoLabel: "Olasılık nedir?",
    fitTitle: (inPossession, outOfPossession, position) =>
      [
        inPossession !== null && `Top bizdeyken: ${inPossession}`,
        outOfPossession !== null && `Top rakipteyken: ${outOfPossession}`,
        `Mevki: ${position}`,
      ]
        .filter(Boolean)
        .join("\n"),
    note: "Uyum, her rol için editörün kendi özellik ağırlıklarını kullanır; bonservis, maaş ve olasılık tahminidir.",
    depth: {
      summary: (size, age, level) =>
        `${format(size)} oyuncu${age === null ? "" : ` · yaş ortalaması ${age}`} · ilk 11 ortalama yeteneği ${level}`,
      weak: "Kalite kadronun gerisinde",
      ageing: "Yaşlı",
      cover: (names) => `Burada da oynayabilir: ${names}`,
      advice: "Öneri al",
      adviceTitle: "Bu mevki için transfer önerileri",
      empty: "Kimse yok",
      ability: "Mevcut yetenek",
      more: (count: number) => `+${format(count)} oyuncu daha`,
      columns: {
        line: "Hat",
        status: "Durum",
        count: "Oyuncu",
        players: "En iyiden başlayarak (yetenek)",
        cover: "Burada da oynayabilir",
        age: "Yaş ort.",
      },
      countTitle: (count, target) =>
        `En iyi mevkisi bu hatta olan ${format(count)} oyuncu; bir kadro burada genelde ${format(target)} oyuncu taşır`,
      statusHelp: {
        missing: "Burada oynayan kimse yok.",
        thin: "Bir kadronun genelde taşıdığından az; burada da oynayabilenler yarım sayılır.",
        fine: "Bir kadronun genelde taşıdığı kadar.",
        crowded: "Bir kadronun genelde taşıdığından en az iki oyuncu fazla.",
      },
      attention: "Dikkat:",
      allFine: "Tüm hatlar dengeli görünüyor.",
      views: { label: "Kadroyu göster", pitch: "Saha", table: "Tablo" },
      pitchLabel: "Sahada kadro, hat hat",
      coverCount: (count) => `${format(count)} oyuncu burada da oynayabilir`,
      adviceFor: (position) => `${position} için transfer önerileri`,
    },
    departures: {
      intro: "Gözlemcinin kadrodan gönderilmesini önerdiği oyuncular; en önemlisi önce.",
      filter: "Tavsiye",
      all: "Hepsi",
      empty: "Gözlemcin şu an kimseyi göndermeyi önermiyor.",
      sortNames: {
        rank: "gözlemcinin sırası",
        name: "isim",
        age: "yaş",
        ca: "mevcut yetenek",
        pa: "potansiyel yetenek",
        value: "değer",
        wage: "maaş",
        contract: "sözleşme bitişi",
      },
      columns: {
        player: "Oyuncu",
        age: "Yaş",
        ability: "Yetenek",
        value: "Değer",
        wage: "Maaş",
        contract: "Sözleşme bitişi",
        advice: "Tavsiye",
        reasons: "Nedenler",
      },
      actions: { sell: "Sat", loan: "Kiralık gönder", release: "Serbest bırak" },
      rank: (line, rank) => `${line} · ${rank}.`,
    },
    actions: {
      column: "Eylemler",
      compare: "Kadronla karşılaştır",
      compareLabel: (name) => `Kadronla karşılaştır: ${name}`,
      similar: "Benzer oyuncuları bul",
      similarLabel: (name) => `Benzerlerini bul: ${name}`,
      report: "Gözlemci raporu",
      reportLabel: (name) => `Gözlemci raporu: ${name}`,
      replacement: "Yerine birini bul",
      replacementLabel: (name) => `Yerine birini bul: ${name}`,
      replacementTitle: "Ona benzeyen ve yerini alabilecek oyuncular",
    },
    why: {
      freeAgent: () => "Serbest oyuncu",
      expiring: (value) => `Sözleşmesi ${value} gün sonra bitiyor`,
      releaseClause: (value, against) =>
        against === null ? `Serbest kalma bedeli ${value}` : `Serbest kalma bedeli ${value} (değeri ${against})`,
      unhappy: (value) => (value === "1" ? "Kulübünde mutsuz" : `Kulübünde mutsuz (${value} neden)`),
      inTheRed: (value) => `Kulübü ekside (${value})`,
      listed: () => "Transfer listesinde",
      loanListed: () => "Kiralık listesinde",
      wonderkid: (value) => `Potansiyel ${value}`,
    },
    verdicts: {
      better: "İlk tercihinden iyi",
      close: "İlk tercihine yakın",
      below: "İlk tercihinin gerisinde",
      none: "Kadronda bu mevkide oynayan yok",
    },
    chances: { likely: "Gelmesi muhtemel", possible: "Gelebilir", hard: "Zor transfer" },
    opportunities: {
      kindsLabel: "Fırsat listeleri",
      kinds: {
        bosman: "Bosman",
        releaseClause: "Serbest kalma bedeli",
        unhappy: "Mutsuzlar",
        inTheRed: "Borçlu kulüpler",
        listed: "Transfer listesi",
        loanListed: "Kiralık listesi",
        wonderkid: "Geleceğin yıldızları",
      } satisfies Record<OpportunityKind, string>,
      hints: {
        bosman: "Serbest oyuncular ve sözleşmesi altı ay içinde bitenler",
        releaseClause: "Serbest kalma bedeli değerinin altında",
        unhappy: "Kulübünde mutsuz",
        inTheRed: "Kulübünün paraya ihtiyacı var",
        listed: "Kulübü satmaya hazır",
        loanListed: "Kulübü kiralık vermeye hazır",
        wonderkid: "19 yaş ve altı, büyük gelecek vaat ediyor",
      } satisfies Record<OpportunityKind, string>,
      countLabel: "Bu listedeki oyuncular",
      count: (count, more) => (more ? `${format(count)}+` : format(count)),
      position: "Mevki",
      anyPosition: "Tüm mevkiler",
      maxAge: "En yüksek yaş",
      maxFee: "En yüksek bonservis",
      betterOnly: "İlk tercihimden iyi",
      betterOnlyTitle: "Yalnızca mevkisine, oradaki en iyi oyuncundan daha uygun olanlar",
      summary: (kind, lowest, highest, pool) =>
        `${kind} · kadronun seviyesine yakın, yeteneği ${lowest}–${highest} olan oyuncular · ${pool} oyuncuya bakıldı`,
      how: {
        label: "Bu listeler nasıl oluşuyor?",
        note: "İlk 11'inin seviyesine yakın oyuncular (30 altından 45 üstüne; senin ve diğer insan menajerlerin oyuncuları hariç), her biri en iyi oynadığı ya da senin seçtiğin mevkide ölçülür. Her liste uyum ve olasılık birlikte tartılarak sıralanır.",
      },
      empty: "Bu filtrelerle bu listede kimse yok.",
      emptyWonderkids: "Bu filtrelerle geleceğin yıldızı yok.",
      better: "Burada ilk tercihinden iyi",
      columns: { position: "Mvk", why: "Neden" },
    },
    similar: {
      intro: "Benzerlerini bulmak için bir oyuncu seç: oyuncuların özellikleri, mevkisinin gerektirdiği yerlerde karşılaştırılır.",
      search: "Karşılaştırılacak oyuncu",
      searchPlaceholder: "İsimle oyuncu ara…",
      noMatch: "Bu isimde oyuncu yok.",
      quickPicks: "Ya da kendi oyuncularından biriyle başla:",
      change: "Başka oyuncu seç",
      reference: "Benzerleri aranan",
      position: "Karşılaştırma mevkisi",
      cheaper: "Daha ucuz",
      cheaperTitle: "Yalnızca değeri ondan düşük olanlar",
      younger: "Daha genç",
      youngerTitle: "Yalnızca ondan genç olanlar",
      maxFee: "En yüksek bonservis",
      value: "Değer",
      notForSale: "Satılık değil",
      doesNotPlay: (position) => `${position} mevkisinde oynamıyor: yalnızca özellikleri karşılaştırılıyor.`,
      summary: (candidates, shown, position) =>
        `${position} mevkisinde ${candidates} oyuncu oynuyor · en benzer ${shown} oyuncu`,
      how: {
        label: "Benzerlik nasıl ölçülüyor?",
        note: "Gözlemci, mevkinin rollerinin dayandığı özellikleri karşılaştırır; kilit olanlar en çok sayılır. Oyuncunun nerede güçlü, nerede zayıf olduğu seviyesinden daha çok sayılır; bu yüzden daha ucuz ya da daha genç bir oyuncu da çok benzer çıkabilir.",
      },
      empty: "Bu ayarlarla benzer oyuncu yok.",
      columns: { similarity: "Benzerlik", value: "Değer" },
      similarityTitle: (value) => `%${format(value)} benzer`,
    },
    compare: {
      title: "Kadronla karşılaştır",
      hint: (position, name) => `${position} mevkisindeki en iyi oyuncun ${name} ile; önce rolün kilit özellikleri.`,
      noStarter: "Kadronda bu mevkide oynayan yok.",
      starter: "İlk tercihin",
      candidate: "Aday",
      inPossession: "Top bizdeyken",
      outOfPossession: "Top rakipteyken",
      add: "Oyuncu ekle",
      addNone: "Listeden seç…",
      remove: (name) => `Karşılaştırmadan çıkar: ${name}`,
      removeShort: "Çıkar",
      scoutView: "Gözlemcinin görüşü",
      rows: {
        fit: "Uyum",
        position: (position) => `${position} mevkisinde`,
        roleRating: (role) => `${role} olarak`,
        probability: "Olasılık",
        fee: "Tahmini bonservis",
        wage: "Maaş",
        contract: "Sözleşme bitişi",
        verdict: "Değerlendirme",
      },
      ownPlayer: "Senin oyuncun",
      roleAttributes: (roles) => `Rolün özellikleri: ${roles}`,
      keyAttribute: "Rolün kilit özelliği",
      versus: (difference) => `İlk tercihine göre ${difference}`,
      best: "en iyisi",
      age: (age) => `${format(age)} yaşında`,
      allAttributes: "Tüm özellikler",
      loading: "Oyuncular okunuyor…",
      close: "Kapat",
    },
    report: {
      title: (name) => `Gözlemci raporu: ${name}`,
      hint: "Görsel olarak kaydet ya da paylaşmak için kopyala.",
      making: "Rapor hazırlanıyor…",
      failed: (reason) => `Rapor hazırlanamadı: ${reason}`,
      alt: (name) => `${name} hakkında gözlemci raporu`,
      save: "Görsel olarak kaydet",
      savePdf: "PDF olarak kaydet",
      saving: "Kaydediliyor…",
      copy: "Görseli kopyala",
      copied: "Panoya kopyalandı.",
      copyFailed: (reason) => `Görsel kopyalanamadı: ${reason}`,
      similar: "Benzer oyuncuları bul",
      saved: (file) => `${file} olarak kaydedildi.`,
      open: "Aç",
      show: "Klasörde göster",
      close: "Kapat",
      heading: "Gözlemci raporu",
      age: (age) => `${format(age)} yaşında`,
      freeAgent: "Serbest oyuncu",
      contract: "sözleşme bitişi",
      fit: "Uyum",
      probability: "Olasılık",
      fee: "Tahmini bonservis",
      abilities: "MY / PY",
      value: "Değer",
      role: "Rol",
      strengths: "Güçlü yönleri",
      weaknesses: "Zayıf yönleri",
      profile: "Karakter",
      note: "Gözlemci notu",
      similarity: (value) => `%${format(value)} benzer`,
      footer: "FMLibreEditor gözlemci raporu · bonservis, maaş ve olasılıklar tahminidir",
      traits: {
        consistent: "İstikrarlı",
        inconsistent: "İstikrarsız",
        bigGames: "Büyük maç oyuncusu",
        nervous: "Büyük maçlarda gergin",
        injuryProne: "Sakatlığa yatkın",
        robust: "Nadiren sakatlanır",
        versatile: "Çok yönlü",
        professional: "Örnek profesyonel",
        ambitious: "Hırslı",
        loyal: "Sadık",
        hotHeaded: "Sinirli",
      },
    },
    youth: {
      intro: "Oyunun kulübün altyapı alımlarında ürettiği ve hâlâ kulüpte olan oyuncular, kulübe katıldıkları güne göre.",
      otherClub: "Başka bir kulübe bak",
      searchLabel: "Bakılacak kulüp",
      mine: "Kulübüme dön",
      intakesLabel: "Altyapı alımları",
      noDay: "Günü bilinmiyor",
      summary: (count, average, best) => `${format(count)} oyuncu · ortalama potansiyel ${average} · en iyisi: ${best}`,
      lent: (count) => `${format(count)} oyuncu kirada`,
      how: {
        label: "Bu liste nasıl hazırlanıyor?",
        note: "Oyunun ürettiği, kulübe 17 yaşında ya da daha genç katılan ve başka hiçbir kulüpte yetişmemiş oyuncular, katıldıkları güne göre. Kiralıkta olanlar listede; satılanlar ya da gönderilenler değil.",
      },
      unmarked:
        "Editör, oyunun bu sürümünde ürettiği oyuncuları nasıl işaretlediğini bilmiyor: kulübün oyun veritabanından gelen kendi genç oyuncuları da listede.",
      empty: (club) => `${club} kulübünde şu an altyapı alımından gelen oyuncu yok.`,
      emptyHint: "Bir alımın oyuncuları kulüpte kaldıkları sürece burada görünür. Başka bir kulübün altyapı alımını görmek için o kulübe bakabilirsin.",
      columns: {
        player: "Oyuncu",
        position: "Mvk",
        born: "Doğum",
        nation: "Uyruk",
        city: "Doğum yeri",
        ca: "MY",
        pa: "PY",
        actions: "Düzenle",
      },
      age: (age) => `${format(age)} yaşında`,
      joinedAt: (age) => `${format(age)} yaşında katıldı`,
      onLoan: (club) => `${club} takımında kirada`,
      youthContract: "Gençlik sözleşmesi",
      edit: (name) => `${name} düzenle`,
      editor: {
        label: (name) => `${name} düzenleniyor`,
        reading: "Değerleri okunuyor…",
        dateOfBirth: "Doğum tarihi",
        nation: "Uyruk",
        city: "Doğum yeri",
        noCity: "Oyunda kayıtlı değil",
        cityHint: "Bu kayıttaki oyuncuların doğduğu şehirler",
        ca: "Mevcut yetenek",
        pa: "Potansiyel yetenek",
        save: "Kaydet",
        saving: "Kaydediliyor…",
        cancel: "Vazgeç",
        profile: "Tüm profil",
        profileTitle: "Mevkiler, özellikler ve gerisi oyuncunun profilinde",
        nothing: "Kaydedilecek bir şey yok: hiçbir değer değişmedi.",
        saved: (count) => `${format(count)} değişiklik kaydedildi.`,
        failed: (field, reason) => `${field}: ${reason}`,
        invalid: (field) => `${field}: alabileceği bir değer değil.`,
      },
      loading: "Altyapı alımları okunuyor…",
      failed: (reason) => `Altyapı alımları okunamadı: ${reason}`,
    },
    roles: {
      bgk: "Ayağı İyi Kaleci",
      ngk: "Risksiz Oynayan Kaleci",
      sk: "Libero Kaleci",
      lhk: "Çizgi Kalecisi",
      cb: "Stoper",
      bcb: "Ayağı İyi Stoper",
      ncb: "Çakılı Stoper",
      acb: "Topla Çıkan Stoper",
      ocb: "Çizgiden Bindiren Stoper",
      scb: "Kesici Stoper",
      ccb: "Alan Savunan Stoper",
      wcb: "Kenar Stoper",
      fb: "Bek",
      ifb: "Stoperleşen Bek",
      pfb: "Presçi Bek",
      hfb: "Alan Savunan Bek",
      wb: "Kanat Bek",
      iwb: "İç Koridorda Oynayan Kanat Bek",
      pwb: "Oyun Kurucu Kanat Bek",
      awb: "Ofansif Bek",
      hwb: "Alan Savunan Kanat Bek",
      dm: "Defansif Orta Saha",
      hb: "Gizli Libero",
      ddm: "İçeri Sarkan Defansif Orta Saha",
      pdm: "Presçi Defansif Orta Saha",
      wdm: "Geniş Alanda Oynayan Defansif Orta Saha",
      bbm: "İki Yönlü Orta Saha",
      bbp: "İki Yönlü Oyun Kurucu",
      dlp: "Derin Oyun Kurucu",
      cm: "Merkez Orta Saha",
      pcm: "Presçi Merkez Orta Saha",
      scm: "Markajcı Merkez Orta Saha",
      chm: "İç Merkez Orta Saha",
      wcm: "Geniş Alanda Oynayan Merkez Orta Saha",
      ap: "Ofansif Oyun Kurucu",
      am: "Ofansif Orta Saha",
      oam: "Pres Kırıcı Merkez Ofansif Orta Saha",
      w: "Kanat Oyuncusu",
      if: "Kanat Forvet",
      iw: "İç Kanat Oyuncusu",
      pw: "Oyun Kurucu Kanat",
      wfd: "Dış Kanat Forvet",
      tw: "Takipçi Kanat",
      iow: "İç Koridorda Bekleyen Kanat",
      wow: "Hareketli Kanat Oyuncusu",
      cfd: "Merkez Forvet",
      dlf: "Yardımcı Forvet",
      chf: "İç Forvet",
      p: "Fırsatçı Oyuncu",
      tcf: "Takipçi Forvet",
      ocf: "Bağlantı Oyuncusu",
      gk: "Kaleci",
      wm: "Dış Kanat Orta Saha",
    },
    reasons: {
      listed: () => "Transfer listesinde",
      freeAgent: () => "Serbest oyuncu",
      expiring: (value) => `Sözleşmesi ${value} gün sonra bitiyor`,
      releaseClause: (value) => `Serbest kalma bedeli ${value}`,
      fringe: () => "Kulübünde düzenli oynamıyor",
      keyPlayer: () => "Kulübünün kilit oyuncusu",
      unwanted: () => "Kulübü ihtiyaç fazlası sayıyor",
      overBudget: (value) => `Bütçeni ${value} aşıyor`,
      stretch: (value) => `Bütçeyi biraz aşıyor (+${value})`,
      wageHigh: (value) => `Maaşı boşluğunu haftada ${value} aşıyor`,
      biggerClub: () => "Daha büyük bir kulüpte",
      smallerClub: () => "Daha küçük bir kulüpte",
      reputationGap: () => "Kulübün için fazla büyük bir isim",
      ambitious: () => "Hırslı: bu adımı ister",
      notForSale: () => "Satılık değil",
    },
    departureReasons: {
      surplus: (value) => `Mevkisinde yığılma (${value} oyuncu)`,
      belowLevel: () => "Kadronun seviyesinin altında",
      ageing: (value) => `Yaşı ilerliyor (${value})`,
      expiring: (value) => `Sözleşmesi ${value} gün sonra bitiyor`,
      highWage: (value) => `Rolüne göre yüksek maaş (${value}/hf)`,
      unhappy: () => "Mutsuz",
      lowMorale: () => "Morali düşük",
      blocked: () => "Gelişmek için forma şansı lazım",
      unwanted: () => "Forma süresi: ihtiyaç fazlası",
      listed: () => "Zaten transfer listesinde",
    },
  },

  /** Recipes (`RecipeMenu`): see `en.ts`. */
  recipes: {
    button: "Tarifler",
    buttonTitle: "Hazır değişiklik setleri; önce önizlenir",
    names: {
      wonderkid: "Geleceğin yıldızı yap",
      injuryProof: "Sakatlanmaz yap",
      longCareer: "Kariyerini uzat",
      richClub: "Kulübü zengin yap",
      topFacilities: "Tesisleri en üst düzeye çıkar",
    },
    notes: {
      wonderkid:
        "21 yaş ve altı: potansiyel yetenek en az 180, yaşına uygun yetenek ve özellikler. Yüksek değerler kalır.",
      injuryProof: "Sakatlık eğilimi 1, doğal kondisyon 20, dayanıklılık en az 15; sakatlıkları iyileşir.",
      longCareer:
        "Planlanan emeklilik kalkar, sözleşme en az 3 yıl sürer, doğal kondisyon 20, profesyonellik en az 18.",
      richClub: "Bakiye, transfer bütçesi ve maaş bütçeleri en zengin kulüplerin düzeyine çıkar.",
      topFacilities: "Beş tesisin hepsi 20 olur.",
    },
    tooOld: (oldest: number) => `${oldest} yaş ve altındaki oyuncular için`,
    command: (recipe: string) => `Tarif: ${recipe}`,
    working: "Değişiklikler hesaplanıyor…",
    summary: (changes: number, kept: number, left: number) =>
      [
        changeCount(changes),
        kept > 0 && `${format(kept)} değer zaten yeterince iyi`,
        left > 0 && valuesLeftAlone(left),
      ]
        .filter(Boolean)
        .join(" · "),
    tableLabel: "Tarifin yapacağı değişiklikler",
    keptHeading: (count: number) => `${format(count)} değer olduğu gibi kalıyor: zaten yeterince iyi`,
    keptLabel: "Zaten yeterince iyi olan değerler",
    valueColumn: "Değer",
    leftLabel: "Tarifin dokunmadıkları",
    undo: "Bu tarifi geri al",
    undoTitle: "Bu tarifin değiştirdiği her şeyi oyuna geri yaz",
  },

  /** A player's development: the Development tab of his profile, the note under his abilities, the squad's arrows (see en.ts). */
  progress: {
    tabsLabel: "Oyuncu profilinin bölümleri",
    tabs: { overview: "Profil", progress: "Gelişim" },
    lockedWhileEdited: "Bu sekmeyi açmak için düzenlemeyi bitirin",
    openTab: "Gelişim sekmesini aç",
    loading: "Kayıtlar okunuyor…",
    failed: (reason: string) => `Kayıtlar okunamadı: ${reason}`,
    since: (date: string) => `${date} tarihinden beri`,
    change: (from: string, to: string, date: string) => `${date} tarihinden beri ${from} → ${to}`,
    rangeLabel: "Dönem",
    ranges: { quarter: "3 ay", year: "1 yıl", all: "Tümü" },
    recorded: (count: number, first: string) => `Kayıt: ${count} · ilk kayıt ${first}`,
    abilityTitle: "Yetenek",
    valueTitle: "Değer",
    attributesTitle: "Değişen özellikler",
    noAttributeChanges: (date: string) => `${date} tarihinden beri hiçbir özellik değişmedi.`,
    emptyTitle: "Henüz karşılaştırılacak kayıt yok",
    emptyText:
      "Uygulama, oyun verilerini her okuduğunda, oyun zamanıyla yaklaşık haftada bir, bütün oyuncuların yeteneklerini, değerini ve özelliklerini not eder. Oyunda ilerleyip verileri yeniden okuyun; bu oyuncunun gelişimi burada görünür.",
    offTitle: "Bu kariyer için gelişim kaydı tutulmuyor",
    offText:
      "Uygulama gelişim kaydını, sizin yönettiğiniz bir menajerin bulunduğu kariyerlerde ve verileri denetimlerinden geçen oyun sürümlerinde tutar.",
  },

  /** The command palette and the names of the keys in the keyboard shortcuts (see en.ts). */
  palette: {
    button: "Ara",
    title: "Ara veya komut çalıştır",
    placeholder: "Oyuncu, personel, kulüp veya komut ara",
    placeholderCommands: "Komut ara",
    commands: "Komutlar",
    goTo: (list: string) => `${list} sekmesine git`,
    searchList: "Bu listede ara",
    editProfile: "Bu profili düzenle",
    doneEditing: "Bu profili düzenlemeyi bitir",
    applyChanges: "Bu profildeki değişiklikleri uygula",
    showAll: (count: number, list: string) => `${list}: ${format(count)} sonucun hepsini göster`,
    searching: "Aranıyor…",
    empty: (query: string) => `“${query}” ile eşleşen bir şey yok.`,
    notConnected: "Oyuncu, personel ve kulüp aramak için oyuna bağlanın.",
    failed: (reason: string) => `Arama yapılamadı: ${reason}`,
    hintMove: "Gezin",
    hintOpen: "Aç",
    hintClose: "Kapat",
    keys: { ctrl: "Ctrl", shift: "Shift", enter: "Enter", escape: "Esc" },
  },

  /** "My club", the page the app opens on (see en.ts). */
  home: {
    nav: "Kulübüm",
    loading: "Kulübünüz aranıyor…",
    failed: (reason: string) => `Kulübünüz aranamadı: ${reason}`,
    manager: (name: string) => `Teknik direktör: ${name}`,
    following: "Takip ettiğiniz kulüp",
    clubsLabel: "Kulüpleriniz",
    openProfile: "Kulüp profili",
    openProfileTitle: "Bu kulübü Kulüpler sekmesinde aç: tesisler, finans, stadyum ve daha fazlası",
    noClubTitle: "Bu kayıtta yönettiğiniz bir kulüp yok",
    noClubText:
      "Onun yerine burada takip edeceğiniz bir kulüp seçin: kadrosu, ilgilenilmesi gerekenler ve tüm takıma " +
      "uygulanan işlemler.",
    chooseAnother: "Başka kulüp seç",
    searchLabel: "Takip edilecek kulüp",
    squad: "Kadro",
    cards: {
      label: "İlgilenilmesi gerekenler",
      lowMorale: "Düşük moral",
      tired: "Yorgun",
      contracts: "Sözleşmesi bitenler",
      injuredHint: "Sakatlığı olan oyuncular",
      bannedHint: "Cezası olan oyuncular",
      lowMoraleHint: (below: string) => `Morali ${below} değerinin altında olan oyuncular`,
      tiredHint: (below: string) => `Enerjisi ${below} değerinin altında olan oyuncular`,
      unrestHint: "Bazı takım arkadaşlarının memnun olmadığı oyuncular",
      contractsHint: (months: number) => `Sözleşmesi ${months} ay içinde biten oyuncular`,
      none: "Yok",
      more: (count: number) => `ve ${format(count)} kişi daha`,
    },
  },

  /** What's new: what a version brings (see en.ts). */
  whatsNew: {
    title: (version) => `${version} sürümündeki yenilikler`,
    updated: "FMLibreEditor güncellendi.",
    version: (version) => `Sürüm ${version}`,
    thanks: (names) => `Katkıları için teşekkürler: ${names}.`,
    allChanges: "Tüm değişiklikler",
    allChangesTitle: "Bu sürümün notlarının tamamını GitHub'da aç",
    close: "Tamam",
    link: "Yenilikler",
    command: "Bu sürümdeki yenilikler",
    versions: {
      "0.5.5": [
        {
          title: "FM 27.1.1.",
          text: "24 Kasım güncellemesi Game Pass, Steam ve Mac'te tanınıyor; her şey onda da eskisi gibi çalışıyor. İleride yeni bir güncelleme çıktığında, onu tanıyan sürüm gelene kadar kulüp finansları ve oynanan taktik okunmaya devam ediyor.",
        },
        {
          title: "Organizasyonlar sekmesi.",
          text: "Her organizasyonun kadro kurallarını gör ve değiştir; örneğin bir kadroya kaç yabancı oyuncu yazdırılabileceğini, bu sezon ve gelecek sezon için ayrı ayrı. Windows'ta ve Apple silicon Mac'lerde.",
        },
        {
          title: "Kiralama.",
          text: "Transfer penceresindeki yeni Kiralık seçeneği, kiralamayı oyunun ertesi gününe ayarlıyor; transfer döneminde de dışında da. Son gününü, maaşın karşı kulübün ödeyeceği payını, aylık ücreti ve istersen satın alma opsiyonunu sen belirliyorsun. Windows'ta ve Apple silicon Mac'lerde.",
        },
        {
          title: "Tarifler.",
          text: "Bir oyuncu ya da kulüp için hazır değişiklik setleri: Geleceğin yıldızı yap, Sakatlanmaz yap, Kariyerini uzat, Kulübü zengin yap ve Tesisleri en üst düzeye çıkar. Her biri bir şey yazmadan önce neyi değiştireceğini gösteriyor; tek bir Geri al hepsini geri alıyor.",
        },
        {
          title: "Gelişim.",
          text: "Uygulama oyunu okudukça her oyuncunun haftalık kaydını tutuyor; oyuncu profilindeki yeni Gelişim sekmesi de yeteneğinin, potansiyelinin, değerinin ve özelliklerinin kariyerin boyunca nasıl değiştiğini gösteriyor.",
        },
        {
          title: "B takımları.",
          text: "Bir kulübün Kadro sekmesi kendi takımlarından sonra B takımlarını da gösteriyor, örneğin Real Madrid için Castilla'yı; takım işlemleri onlarda da çalışıyor.",
        },
        {
          title: "Daha kısa notlar.",
          text: "Düğmelerin notları artık tek satır; pencere boyunca uzanan bir şerit yerine küçük bir kutuda çıkıyor.",
        },
      ],
      "0.5.4": [
        {
          title: "Transferler oyuncunun geçmişinde.",
          text: "Bir oyuncuyu taşırken artık ilk seçenek olan Transfer, transferi oyunun ertesi gününe ayarlıyor. Oyun onu kendi transferlerinden biri gibi yapıyor: bonservis bedelini ödüyor ve transferi oyuncunun kariyer geçmişine işliyor; bu sezon eski kulübünde oynadığı maçlar ayrı bir satırda kalıyor. Şimdi taşı ise oyuncuyu eskisi gibi anında taşıyor.",
        },
        {
          title: "Takımı en iyi ve en kötü hâline getir.",
          text: "Bir kulübün Kadro sekmesinde tek tuş bütün takımı iyileştiriyor, moralini yükseltiyor, dinlendiriyor, uyumunu ve taktiğini en üste çıkarıyor; Takımı en kötü hâline getir ise bir soru sorduktan sonra tersini yapıyor. İkisini de tek bir Geri al geri alıyor; tek tek işlemler Diğer işlemler menüsünde.",
        },
        {
          title: "Kadro özellikleri.",
          text: "Bir kulübün Kadro sekmesinde, Diğer işlemler menüsündeki Kadro özellikleri, seçtiğin özellikleri takımdaki her oyuncuya ekliyor ya da onlardan kaldırıyor; oyuncuların diğer özelliklerine dokunmuyor. Tek bir Geri al hepsini geri alıyor.",
        },
        {
          title: "Tüm personeli taşı.",
          text: "Bir kulübün Personel sekmesi bütün personeli tek seferde başka bir kulübe, herkesi aynı görevinde taşıyor; tek bir Geri al hepsini geri getiriyor.",
        },
        {
          title: "Milli takımlar.",
          text: "Milli takımın A kadrosuna Hepsini iyileştir, Hepsine moral ver ve Hepsini dinlendir geldi; kadro tablosu enerjiyi, maç kondisyonunu ve morali gösteriyor.",
        },
        {
          title: "Sponsorluk anlaşmaları.",
          text: "Bir kulübün finansları sponsorluk anlaşmalarını salt okunur olarak listeliyor: her birinin sezon başına ve toplamda ne ödediği, süresi ve küme düşmede neyin değiştiği. Şimdilik Game Pass 0.9.2524.0'da.",
        },
        {
          title: "Düzeltme.",
          text: "Bazı kariyerlerde personel doğru okunduğu hâlde personel denetimi başarısız oluyor; personel salt okunur kalıyor, iyileştirme, Uyumu tamamla ve Taktiği tamamla reddediliyordu. Artık geçiyor.",
        },
      ],
      "0.5.3": [
        {
          title: "FM27'nin 17 Kasım güncellemesi.",
          text: "Windows'ta ve macOS'ta Game Pass 0.9.2524.0 ve Steam 26620374 sürümleri tanınıyor; güncellemenin yerini değiştirdiği kulüp finansları ve takımınızın oynadığı taktik yeniden okunuyor.",
        },
        {
          title: "Milli takımlar.",
          text: "Kulüp listesinin üstündeki seçici her ülkenin erkek ve kadın milli takımlarını gösteriyor: takımın kadrosu, genç takımları (U21, U20 ve diğerleri) ve onların kadroları, her birinin düzenleyebileceğiniz itibarıyla.",
        },
        {
          title: "Lig para ödülü.",
          text: "Bir kulübün genel bakışı, liginin bu sezon sezon sonu sıralamasına göre ve maç başına ne ödediğini gösteriyor; tutarlar sezon bitene kadar ligdeki her kulüp için değiştirilebiliyor.",
        },
        {
          title: "Düzeltme.",
          text: "Altyapı oyuncuları 2020'den sonra doğmuş bir kayıt, editörün yazmadan önceki denetimine artık takılmıyor.",
        },
      ],
      "0.5.2": [
        {
          title: "Kulübüm.",
          text: "Uygulama yönettiğiniz kulüple açılıyor: ilgilenmeniz gereken oyuncular, kulübün parası ve kadro işlemleri tek yerde. Kendi kulübünüz yoksa bir kulübü takip edebilirsiniz.",
        },
        {
          title: "Komut paleti.",
          text: "Ctrl+K (Mac'te ⌘K) bir oyuncuyu, personeli, kulübü ya da bir komutu bulur; kısayollarla sekmeler arasında geçebilirsiniz.",
        },
        {
          title: "Gözlem.",
          text: "Piyasadaki fırsatlar, gözden çıkaracağınız bir oyuncuya benzeyenler, mevkisindeki 1 numaranızla karşılaştırma, resim ya da PDF olarak kaydedilen gözlem raporları, sahada kadro ve altyapı alımları.",
        },
        {
          title: "Oyuncuyu yeniden adlandırın.",
          text: "Ad, soyad, bilinen ad ve tam ad. Oyun yeni adı kayıtlarında tutar.",
        },
        {
          title: "Sözleşmeler ve personel.",
          text: "Bir sözleşmeyi tek tıkla beş yıl uzatın ya da toplu düzenlemede birçoğuna yıl ekleyin. Bir personeli ya da kulübün bütün personelini serbest bırakın, tek Geri al ile geri getirin.",
        },
        {
          title: "Taktiği tamamla.",
          text: "Kulübün Kadro sekmesinde takımın taktik aşinalığını en üste çıkarır. Mutsuzluk nedenleri de artık oyunun kendi sözleriyle yazılıyor.",
        },
        {
          title: "Değişiklikleriniz kalıyor.",
          text: "Her kariyerin değişiklikleri uygulamayı yeniden açtıktan sonra da Değişiklikler sekmesinde; arayabilir, süzebilir ve dışa aktarabilirsiniz.",
        },
        {
          title: "Kulüp filtreleri.",
          text: "Ülke, lig ve itibar; Toplu düzenleme ve Dışa aktar, listenin gösterdiği kulüpleri alır.",
        },
        {
          title: "Rusça ve Japonca.",
          text: "İki dil daha. Steam'in 12 Kasım güncellemesi de artık tanınan bir sürüm.",
        },
      ],
    },
  },

  errors,
};
