// The Japanese text of the UI: the same shape as `en.ts` (a missing or extra key fails the build), in the Japanese of
// Japan, whose conventions the dates and numbers follow too (see `index.ts`). Sentences use the polite style
// ("…します", "…してください"); labels and buttons are short nouns or verbs, as Japanese software writes them. The
// comments in `en.ts` say what each string is for.
//
// FM27 has no Japanese text of its own, so the football words follow what Japanese football and the Japanese FM
// community use: "現在能力 (CA)", "潜在能力 (PA)", "コンディション", "試合勘", "決定力", "ホームグロウン". Position
// abbreviations stay as the game writes them (GK, DC, ST), as Japanese players read them.
//
// Japanese has no plural, and counts take a counter word after the number ("選手3人", "12クラブ", "3件の変更").

import type { Concern, Entity, ExportEntity, OpportunityKind } from "../types";
import type { ErrorTexts, Strings } from "./en";
import { fieldName } from "./fieldNames";
import { reasonText } from "./reasons";
import { REASONS_JA } from "./reasons/ja";

const numbers = new Intl.NumberFormat("ja-JP");
const percents = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 });

/** A count or an amount with the thousands separators of the language: "12,345". */
const format = (value: number) => numbers.format(value);

/** "3件の変更". */
const changes = (count: number) => `${format(count)}件の変更`;

/** For the places that say how many changes there are, which may be none: "変更なし", "3件の変更". */
const changeCount = (count: number) => (count === 0 ? "変更なし" : changes(count));

/** "選手12人". */
const playerCount = (count: number) => `選手${format(count)}人`;

/** "12件の値はそのまま". */
const valuesLeftAlone = (count: number) => `${format(count)}件の値はそのまま`;

/** What each list holds. */
const nouns: Record<Entity, string> = { player: "選手", staff: "スタッフ", club: "クラブ" };

/** "選手237人", "スタッフ1人", "12クラブ". */
const entityCount = (entity: Entity | ExportEntity, count: number) =>
  entity === "club" ? `${format(count)}クラブ` : `${nouns[entity]}${format(count)}人`;

/** Squad statuses, by the codes contracts hold them as (see `en.ts`). */
const SQUAD_STATUSES: Partial<Record<number, string>> = {
  1: "スター選手",
  2: "重要な選手",
  3: "レギュラー",
  4: "スカッドプレーヤー",
  5: "スーパーサブ",
  7: "当落線上の選手",
  9: "緊急時の控え",
  10: "ブレイク間近の有望株",
  11: "将来の有望株",
  13: "若手",
  14: "Bチームのレギュラー",
  15: "正GK",
  16: "カップ戦用GK",
  17: "国内カップ戦用GK",
  20: "控え",
  21: "緊急時の控え（GK）",
  22: "構想外",
};

/** The kinds of contract, by the codes contracts hold them as (see `en.ts`). */
const CONTRACT_TYPES: Partial<Record<number, string>> = {
  0: "パートタイム契約",
  1: "フルタイム契約",
  2: "アマチュア契約",
  3: "ユース契約",
  4: "非契約",
  8: "シニア契約",
  10: "シニア最低年俸契約",
  11: "シニア契約",
};

/** The name of the field a failure names. */
const field = (key: string | undefined) => fieldName(ja, key ?? "");

/** A day the commands name as "20280131", written out in the language's own way. */
const dayText = (value: string | undefined) => {
  const [y, m, d] = [Number(value?.slice(0, 4)), Number(value?.slice(4, 6)), Number(value?.slice(6, 8))];
  return new Date(y, m - 1, d).toLocaleDateString("ja-JP", { day: "numeric", month: "long", year: "numeric" });
};

/** What a check is about, from the key a failure gives. */
const checkName = (key: string | undefined) => (ja.checks as Partial<Record<string, string>>)[key ?? ""] ?? key ?? "";

/** The name of a job code a failure gives, as `jobs` below has it. */
const jobName = (code: string | undefined) => (ja.jobs as Partial<Record<number, string>>)[Number(code)] ?? code ?? "";

/** The noun of the kind of record a failure names, or "記録" when it names none. */
const recordNoun = (entity: string | undefined) =>
  entity === "player" || entity === "staff" || entity === "club" ? nouns[entity] : "記録";

/** The reasons the Rust side gives for a field that cannot be changed some way. */
const UNSUPPORTED: Partial<Record<string, string>> = {
  "a date can only be set or moved by years": "日付は直接指定するか、年数を加算することしかできません",
  "only a date can be moved by years": "年数を加算できるのは日付だけです",
  "it is changed one person at a time": "1人ずつしか変更できません",
  "the new value is not one of the game's own records of that kind": "新しい値が、ゲーム内にあるその種類の記録ではありません",
  "the in-game date is not known": "ゲーム内の日付がわかりません",
};

const reload = "データを再読み込みしてから、もう一度お試しください";

/** The lists of a club's staff, as `staff.noRoom` names them. */
const STAFF_DEPARTMENTS: Partial<Record<string, string>> = {
  medical: "メディカル部門",
  coaching: "コーチ陣",
  scouting: "スカウト部門",
};

const errors: ErrorTexts = {
  "team.nobodyInjured": () => "このチームに負傷者はいません。",
  "team.noCohesion": () => "エディターはこのチームの連携を読み取れません：このバージョンのゲームで未確認か、どの選手にもクラブとの連携の記録がありません。",
  "team.noTactics": () => "このチームが戦術をどれだけ理解しているか読み取れません：このバージョンのゲームではまだ確認されていないか、チームがあなたの選んだ戦術を使っていません。",
  "guard.unknownBuild": () =>
    "このバージョンのゲームは FMLibreEditor で未確認のため、ゲームへの書き込みは行いません。上部のお知らせの" +
    "「それでも編集する」を押すと編集できるようになります。",
  "guard.failed": (p) =>
    `このバージョンのゲームでは「${checkName(p.check)}」の検査に合格しなかったため、FMLibreEditor は変更しません。`,
  "edit.unknownField": (p) => `ここには「${p.field}」という編集可能な項目はありません。`,
  "edit.outOfRange": (p) => `${p.value} は${field(p.field)}として無効な値です。${p.min}〜${p.max} の範囲で入力してください。`,
  "edit.notADate": (p) => `${p.value} は${field(p.field)}の日付として無効です。`,
  "edit.notAChoice": (p) => `${p.value} は${field(p.field)}で選べる値ではありません。`,
  "edit.taken": (p) => `背番号 ${p.value} は使用中です：${p.name ?? `UID ${p.uid} の選手`}がつけています。`,
  "edit.unsupported": (p) => `${field(p.field)}はその方法では変更できません：${UNSUPPORTED[p.reason] ?? p.reason}。`,
  "edit.moved": (p) => `この${recordNoun(p.entity)}のデータはゲームのメモリ内で移動しました。${reload}。`,
  "edit.noRecord": (p) => `${field(p.field)}はここでは変更できません：記録がないか、検査に合格しませんでした。`,
  "edit.unset": (p) => `${field(p.field)}はゲーム内で設定されていないため、そのままにしました。`,
  "edit.implausible": (p) =>
    `${field(p.field)}の値 ${p.value} はありえない値のため、安全のためそのままにしました。`,
  "edit.notApplied": (p) => `${field(p.field)}：${p.wrote} を書き込みましたが、読み戻すと ${p.read} でした。`,
  "edit.conflict": (p) =>
    `${field(p.field)}は現在 ${p.expected} ではなく ${p.found} です：その後ゲームが変更しました。`,
  "move.moved": () => `選手のデータはゲームのメモリ内で移動しました。${reload}。`,
  "move.notAClub": () => "このクラブには選手が所属できるトップチームがありません。",
  "move.freeAgent": () => "この選手はフリーエージェントです：離れるクラブもトレード相手のクラブもありません。",
  "move.sameClub": () => "この選手はすでにこのクラブに所属しています。",
  "move.onLoan": () =>
    "この選手はローン移籍中です。先にプロフィールのローン欄で呼び戻すか、完全移籍にしてください。",
  "move.notOnLoan": () => "この選手はローン移籍中ではありません。",
  "move.playerCoach": () => "選手兼コーチは移籍させられません：スタッフとしても働いているためです。",
  "move.unusualContract": () => "この選手の契約は通常の選手契約ではありません。",
  "move.humanClub": () =>
    "この選手は人間の監督が率いるクラブに所属しています。このバージョンのゲームでは、エディターがそのクラブの戦術の" +
    "メンバー表をまだ見つけられないため、ゲーム内でしかクラブを離れられません。",
  "move.menAndWomen": () => "一方は男子クラブ、もう一方は女子クラブです。",
  "move.notListed": () => "選手がいるはずのメンバー表の位置にいません。",
  "move.noRoom": (p) =>
    `クラブのメンバー表に選手を追加する空きがなく（現在 ${p.players}人）、このシステムではエディターがメンバー表を` +
    "広げられません。",
  "sign.noPool": () =>
    "このバージョンのゲームでは、ゲームが契約を保管している場所をエディターが見つけられないため、フリーエージェントと" +
    "契約できません。",
  "sign.poolFull": () =>
    "ゲームが新しい契約枠を作るまで、契約を追加する空きがありません。ゲームを1日進めてから、もう一度お試しください。",
  "arrange.unknown": () => "このバージョンのゲームで、ゲームが移籍を保持している場所をエディターが見つけられません。",
  "arrange.underWay": () => "この選手にはすでに合意済みの移動、または未回答のオファーがあります。",
  "arrange.noMemory": () =>
    "エディターはこのためのゲーム内メモリを確保できませんでした。システムが、ゲーム自身の関数を代わりに実行することを許可しませんでした。",
  "arrange.made": () => "ゲームはすでにこの移籍を行ったか、手配で書き込まれた内容を変更したため、元に戻せません。",
  "sign.noModel": () => "このクラブのトップチームには、新しい契約の手本にできる通常の契約選手がいません。",
  "sign.noDate": () => "新しい契約の開始日となるゲーム内の日付を、エディターが読み取れませんでした。",
  "loan.end": (p) => `レンタルは加入後、契約満了までに終了する必要があります：${dayText(p.earliest)}〜${dayText(p.latest)}。`,
  "loan.noModel": () => "ゲームには、これの手本にできる進行中の自前のレンタルがありません。ゲーム内で1日進めてからもう一度お試しください。",
  "move.outOfRange": (p) => `${p.value} は${field(p.field)}として無効な値です。${p.min}〜${p.max} の範囲で入力してください。`,
  "move.changed": () => `その後、ゲームが該当するメモリを変更しました。${reload}。`,
  "move.notApplied": () => "メモリに書き込みましたが、読み戻すと別の値が入っていました。",
  "retirement.unknown": () => "このバージョンのゲームでは、エディターが引退予定の情報を見つけられません。",
  "retirement.none": () => "ゲームはこの選手の引退を予定していません：すでに現役を続けるつもりです。",
  "clause.noContract": () => "この選手には契約がありません。",
  "clause.missing": () => `この条項はもう契約にありません。${reload}。`,
  "clause.notInClause": (p) => `この条項には変更できる${p.field === "clause.amount" ? "金額" : "条件"}がありません。`,
  "clause.same": () => "契約にはすでに同じ内容があります。",
  "clause.noRoom": () =>
    "契約の条項リストに空きがなく、エディターはリストを広げられません。代わりに既存の条項を変更してください。",
  "heal.notInjured": () => "この選手には治療する負傷がありません。",
  "ban.notBanned": () => "この選手には解除する出場停止がありません。",
  "relation.missing": () => `その国籍または育成の記録は、もう選手のリストにありません。${reload}。`,
  "relation.noRoom": () =>
    "選手のリストに空きがなく、エディターはリストを広げられません。代わりに既存の項目を変更してください。",
  "relation.target": () => "この項目に入れられる種類のゲーム内の国やクラブではありません。",
  "relation.same": () => "この選手にはすでに同じ内容があります。",
  "relation.rule": (p) => `ホームグロウン規定 ${p.rule} はエディターが書き込める規定ではありません。`,
  "staff.you": () => "あなたが操作している監督です。",
  "staff.unemployed": () => "このスタッフはクラブに所属していません。",
  "staff.role": () =>
    "クラブまたはそのチームがこのスタッフを直接指しています（フットボールディレクターを兼ねる監督や、チームを直接率いる" +
    "会長など）。このような異動はゲームに任せています。",
  "staff.notListed": () => "このスタッフがいるはずのクラブのスタッフ表の位置にいません。",
  "staff.noRoom": (p) =>
    `クラブの${STAFF_DEPARTMENTS[p.department] ?? p.department}のリストに空きがなく（現在 ${p.staff}人）、ここでは` +
    "エディターがリストを広げられません。",
  "names.unknown": () =>
    "エディターはこのバージョンのゲームで人物の名前が保存されている場所を見つけられないため、変更できません。",
  "names.noRoom": (p) =>
    `現在ゲームには新しい${({ first: "名", last: "姓", common: "通称" } as Record<string, string>)[p.table] ?? "名前"}を追加する空きがありません。` +
    "新しい選手やスタッフが加わると、ゲームが自動で空きを作ります。または、ゲームをセーブし、セーブデータを読み込み直してから、もう一度お試しください。",
  "names.same": () => "すでにその名前です。",
  "names.bad": (p) =>
    `名と姓は空にできず、名前は空白で始めたり終えたりできず、制御文字も使えず、${p.max}バイトを超えることもできません。`,
  "stadium.none": () => "クラブのトップチームが使うスタジアムを読み取れません。",
  "stadium.shared": (p) =>
    `ゲーム内の ${p.holders} 件がこの名前を共有しているため、スタジアムの名前だけを変えることはできません。`,
  "stadium.nameLength": (p) =>
    `ゲームが名前を保管する場所に収まるよう、このスタジアムの新しい名前は ${p.min}〜${p.max} バイトにしてください。` +
    `入力した名前は ${p.bytes} バイトです。`,
  "stadium.badName": () =>
    "スタジアム名は空にできず、空白で始めたり終えたりできず、制御文字も使えません。",
  "staff.job": (p) => `エディターはまだ「${jobName(p.job)}」のスタッフを異動させたり、その職を与えたりできません。`,
  "staff.directorTaken": (p) =>
    `このクラブにはすでにフットボールディレクターがいます：${p.name ?? "他の人"}。このスタッフには別の職を与えるか、` +
    `先に${p.name ?? "その人"}を異動させてください。`,
  "staff.managerTaken": (p) =>
    `このクラブにはすでに監督がいます：${p.name ?? "他の人"}。このスタッフには別の職を与えるか、` +
    `先に${p.name ?? "その人"}を異動させてください。`,
  "staff.yourClub": () =>
    "あなたが率いるクラブです。このスタッフには別の職を与えてください：FMLibreEditor があなたの座を奪うことはありません。",
  "staff.noJob": () => "クラブで担当する職を選んでください。",
  "staff.noModel": (p) =>
    p.staff === "0"
      ? "このクラブにはスタッフが1人もいません：このセーブでプレー可能でないリーグのクラブには、ゲームはスタッフを置きません。"
      : "このクラブのスタッフには、新しい契約の手本にできる正式な契約を持つ人がいません。",
  "squad.noTeam": () => `クラブにそのチームがないか、検査に合格しませんでした。${reload}。`,
  "captain.notInTeam": () => "この選手はこのチームでプレーしていません：キャプテンはそのチームの選手しか務められません。",
  "captain.unchanged": () => "この選手はすでにその役割を務めています。",
  "session.notRunning": () =>
    "Football Manager 27 が起動していません。ゲームを起動してセーブデータを読み込んでから、もう一度お試しください。",
  "session.noSuchProcess": (p) => `PID ${p.pid} の ${p.exe ?? "fm.exe"} プロセスはありません。`,
  "session.severalRunning": (p) => `${p.exe ?? "fm.exe"} が ${p.count} 個起動しています（${p.pids}）。1つを選んでください。`,
  "session.pluginNotLoaded": () =>
    "ゲームデータがまだ読み込まれていません。メインメニューが表示されるまで待ってから、もう一度お試しください。",
  "session.unsupportedEdition": (p) => `FM${p.edition} にはまだ対応していません。`,
  "session.unknownEdition": () => "どの Football Manager か判別できません。",
  "session.playersNotFound": () =>
    "選手リストが見つかりませんでした。セーブデータを読み込んでから（メインメニューだけでは不十分です）、もう一度お試しください。",
  "memory.win32": (p) => `Windows が操作を拒否しました（${p.operation}、エラー ${p.code}）。`,
  "memory.read": (p) => `ゲームのメモリを読み取れません（システムエラー ${p.code}）。`,
  "memory.write": (p) => `ゲームのメモリに書き込めません（システムエラー ${p.code}）。`,
  "memory.readOnly": () => "ゲームは読み取り専用で開かれました：Windows が書き込みを許可しませんでした。",
  "memory.notWritable": () => "そのアドレスはゲームの書き込み可能なデータメモリではないため、書き込みませんでした。",
  "memory.invalidPe": () => "ゲームのモジュールを読み取れません。",
  "memory.invalidMachO": () => "ゲームのモジュールを読み取れません。",
  "memory.mach": (p) => `macOS が操作を拒否しました（${p.operation}、エラー ${p.code}）。`,
  "memory.posix": (p) => `macOS が操作を拒否しました（${p.operation}、errno ${p.code}）。`,
  "guard.saveChanged": () =>
    "FMLibreEditor が読み取った後に、ゲームがセーブデータを読み込んだか、メインメニューに戻りました。データを" +
    "再読み込みするまで、何も変更しません。",
  "memory.noBridge": () =>
    "macOS が FMLibreEditor のゲームへのアクセスを許可していません：ゲームが FMLibreEditor ブリッジなしで起動されました。" +
    "ブリッジを設定してから、Steam からゲームを起動し直してください。",
  "memory.bridge": (p) => `ゲーム内の FMLibreEditor ブリッジがメモリを渡しませんでした（${p.reason}）。`,
  "scout.noClub": () => "このセーブではクラブを率いていないため、スカウトする対象がありません。",
  "scout.noTactic": (p) => `${p.club} の戦術をゲームから読み取れませんでした。`,
  "scout.notPlaced": () => "この選手は戦術のどのポジションにも配置されていません。",
  "scout.unknownRole": (p) => `エディターが知らない役割です：${p.role}。`,
  "setup.steamRunning": () =>
    "Steam が起動中のため、FM27 の起動オプションは変更しませんでした。ブリッジ自体はインストール済みです。Steam を終了して" +
    "からもう一度お試しいただくか、Steam で起動オプションを直接入力してください。",
  "setup.noSteamAccount": () =>
    "この Mac で Steam アカウントが見つかりませんでした。Steam を開いて一度ログインしてください。",
  "setup.noLibrary": (p) => `アプリにブリッジのファイルがありません：${p.path}`,
  "setup.unknownConfig": (p) => `${p.path}：FMLibreEditor が知らない形式のため、変更しませんでした。`,
  "setup.io": (p) => `${p.path}：${p.error}`,
  "app.internal": () => "アプリで予期しないエラーが発生しました。",
  "app.notConnected": () => "ゲームに接続されていません。",
  "app.notFound": (p) => `リストに ID ${p.uid} の${recordNoun(p.entity)}がいません。データを再読み込みしてください。`,
  "app.dataChanged": () => `このデータはゲーム内で変更されました。${reload}。`,
  "app.noChange": (p) => `変更 ${p.id} はありません。`,
  "app.alreadyUndone": () => "この変更はすでに元に戻されています。",
  "app.historyOnly": () => "この変更はアプリが最後に接続する前に行われ、元に戻すには当時のゲームのメモリが必要でした：手動で元に戻してください。",
  "app.history": (p) => `履歴を消去できませんでした：${p.reason}`,
  "export.failed": (p) => `ファイルを書き込めませんでした：${p.reason}`,
  "export.notAllowed": (p) =>
    `FMLibreEditor は ${p.folder} に書き込めません。macOS から書類フォルダの使用について確認された場合は、` +
    "システム設定 › プライバシーとセキュリティ › ファイルとフォルダで許可してから、もう一度書き出してください。",
  "export.noFolder": () => "書き出し先のフォルダがありません。",
  "export.notExported": () => "FMLibreEditor が書き出したファイルではありません。",
  "export.openFailed": (p) => `開けませんでした：${p.reason}`,
  "mass.noOperations": () => "変更する項目を1つ以上選んでください。",
  "mass.tooMany": (p) =>
    `該当が ${p.count} 件あります。一括編集するには、検索やフィルターで ${p.limit} 件以下に絞り込んでください。`,
  "recipe.tooOld": (p) => `この選手は${p.age}歳です：このレシピは${p.oldest}歳以下の選手向けです。`,
  "recipe.ageUnknown": () => "この選手の年齢がわからないため、年齢をもとにするこのレシピは使えません。",
  "recipe.outOfDate": () => "このプレビューは最新ではありません。レシピをもう一度開いてください。",
  "mass.outOfDate": () => "このプレビューは最新ではありません。一括編集のプレビューをもう一度実行してください。",
};

/** The kinds of contract clauses and bonuses, by the codes contracts hold them as (see `en.ts`). */
const CLAUSE_NAMES_JA: Partial<Record<number, string>> = {
  0: "最低移籍金による契約解除条項",
  1: "降格時の契約解除条項",
  2: "昇格失敗時の契約解除条項",
  3: "毎年の昇給",
  4: "昇格時の昇給",
  5: "降格時の減給",
  6: "スタッフ職のオファー時の契約解除条項",
  8: "将来の移籍金の分配（割合）",
  9: "将来の移籍利益の分配（割合）",
  10: "シーズン得点数達成ボーナス",
  11: "リーグ戦出場数達成で1年延長（最終シーズン）",
  12: "チーム最高給与と同額にする条項",
  13: "クラブでのリーグ戦出場数達成後の給与",
  14: "1部昇格時の昇給",
  15: "1部降格時の減給",
  16: "最低移籍金による契約解除条項（国外クラブ）",
  17: "最低移籍金による契約解除条項（上位リーグの国内クラブ）",
  18: "最低移籍金による契約解除条項（国内クラブ）",
  19: "代表出場数達成後の給与",
  20: "スポンサーによる給与負担の割合",
  21: "選手への入場料収入の分配率",
  22: "クラブによる契約延長オプション",
  23: "監督就任時のクラブへの補償金免除",
  25: "リーグ戦出場数達成で1年延長（最終シーズンに昇格）",
  26: "リーグ戦出場数達成で1年延長（最終シーズンに残留）",
  27: "最低移籍金による契約解除条項（UEFAチャンピオンズリーグ出場クラブ）",
  28: "MLS保証契約条項",
  29: "昇格後の契約延長",
  30: "負傷時の契約解除条項",
  31: "最低移籍金による契約解除条項（大陸大会出場クラブ）",
  32: "出場給",
  33: "ゴールボーナス",
  34: "クリーンシートボーナス",
  37: "代表出場ボーナス",
  38: "ベンチ入り（出場なし）手当",
  39: "アシストボーナス",
  40: "シーズンアシスト数達成ボーナス",
  41: "シーズン得点・アシスト合計達成ボーナス",
  54: "ゲーム内で表示なし（54）",
  55: "有効な降格時の契約解除条項",
  56: "有効な昇格失敗時の契約解除条項",
  58: "ゲーム内で表示なし（58）",
  63: "ゲーム内で表示なし（63）",
};

/** Players' traits (preferred moves), by their bit in the game's mask (see `en.ts`). */
const TRAIT_NAMES_JA: readonly string[] = [
  "左サイドをドリブルで駆け上がる",
  "右サイドをドリブルで駆け上がる",
  "中央をドリブルで突破する",
  "相手ペナルティエリアに侵入する",
  "チャンネルに走り込む",
  "可能な限り前線に上がる",
  "短く簡単なパスを好む",
  "キラーパスを頻繁に狙う",
  "遠目からシュートを打つ",
  "パワーシュートを打つ",
  "コースを狙ってシュートする",
  "カーブをかける",
  "GKをかわすのを好む",
  "オフサイドトラップの裏を狙う",
  "アウトサイドキックを使う",
  "相手を厳しくマークする",
  "相手を挑発する",
  "審判に抗議する",
  "ゴールに背を向けてプレーする",
  "下がってボールを受ける",
  "ワンツーを使う",
  "GKの頭上を越すループシュートを好む",
  "試合のテンポを支配する",
  "オーバーヘッドキックを試みる",
  "シュートよりもパスを選ぶ",
  "スルーパスを出さない",
  "プレーを止める",
  "ボールを前に出して相手を抜く",
  "ドリブル前に右足に持ち替える",
  "ドリブル前に左足に持ち替える",
  "ボールを持ちすぎる",
  "遅れて相手エリアに入る",
  "ピンチをドリブルで切り抜けようとする",
  "常に後方に留まる",
  "逆足を使わない",
  "トリックを試みる",
  "遠距離からFKを狙う",
  "スライディングタックルを仕掛ける",
  "スライディングタックルをしない",
  "カットインする",
  "タッチライン際に張る",
  "観客を盛り上げる",
  "ダイレクトシュートを狙う",
  "ロングパスを狙う",
  "足元へのパスを好む",
  "FKを強く蹴る",
  "何度も相手を抜こうとする",
  "逆サイドへのサイドチェンジを好む",
  "絶頂期に引退する",
  "できる限り長く現役を続ける",
  "低く速いロングスローを持つ",
  "頻繁にドリブルする",
  "ほとんどドリブルしない",
  "逆足を鍛えようとする",
  "動かないターゲットマン",
  "ロングスローでカウンターを始める",
  "ロングシュートを控える",
  "左サイドからカットインする",
  "右サイドからカットインする",
  "早めにクロスを上げる",
  "守備ラインからボールを持ち上がる",
  "足元でボールを扱う"
];

export const ja: Strings = {
  attributes: {
    // Technical
    corners: "コーナーキック",
    crossing: "クロス",
    dribbling: "ドリブル",
    finishing: "決定力",
    first_touch: "ファーストタッチ",
    free_kicks: "フリーキック",
    heading: "ヘディング",
    long_shots: "ロングシュート",
    long_throws: "ロングスロー",
    marking: "マーク",
    passing: "パス",
    penalty_taking: "PK",
    tackling: "タックル",
    technique: "テクニック",
    // Mental
    aggression: "積極性",
    anticipation: "予測",
    bravery: "勇敢さ",
    composure: "冷静さ",
    concentration: "集中力",
    decisions: "判断力",
    determination: "意志の強さ",
    flair: "ひらめき",
    leadership: "リーダーシップ",
    off_the_ball: "オフ・ザ・ボール",
    positioning: "ポジショニング",
    teamwork: "チームワーク",
    vision: "視野",
    work_rate: "運動量",
    // Physical
    acceleration: "加速力",
    agility: "敏捷性",
    balance: "バランス",
    jumping_reach: "ジャンプ到達点",
    natural_fitness: "回復力",
    pace: "スピード",
    stamina: "スタミナ",
    strength: "フィジカルの強さ",
    // Goalkeeping (first touch and passing are shared with Technical)
    aerial_reach: "空中到達点",
    command_of_area: "エリア支配",
    communication: "コミュニケーション",
    eccentricity: "奇抜さ",
    handling: "ハンドリング",
    kicking: "キック",
    one_on_ones: "1対1",
    punching: "パンチング（傾向）",
    reflexes: "反応",
    rushing_out: "飛び出し（傾向）",
    throwing: "スロー",
    // Hidden
    consistency: "安定感",
    dirtiness: "ラフプレー",
    important_matches: "大舞台での強さ",
    injury_proneness: "負傷しやすさ",
    versatility: "万能性",
    // Feet
    left_foot: "左足",
    right_foot: "右足",
  },

  staffAttributes: {
    // Coaching
    attacking: "攻撃",
    defending: "守備",
    fitness: "フィットネス",
    goalkeeping: "ゴールキーピング",
    possession: "ポゼッション",
    set_pieces: "セットプレー",
    tactical: "戦術",
    technical: "技術",
    working_with_youngsters: "若手の指導",
    // Mental
    authority: "威厳",
    determination: "意志の強さ",
    motivating: "鼓舞力",
    people_management: "人心掌握",
    // Knowledge
    data_analysis: "データ分析",
    judging_ability: "選手能力の判定",
    judging_potential: "選手潜在能力の判定",
    judging_staff: "スタッフ能力の判定",
    negotiating: "交渉力",
    tactical_knowledge: "戦術知識",
    // Medical
    physiotherapy: "理学療法",
    sports_science: "スポーツ科学",
  },

  personality: {
    adaptability: "適応力",
    ambition: "野心",
    loyalty: "忠誠心",
    pressure: "重圧への耐性",
    professionalism: "プロ意識",
    sportsmanship: "スポーツマンシップ",
    temperament: "気性",
    controversy: "物議を醸す傾向",
  },

  /** The abbreviations of the positions: the same in every language. */
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
    training: "トレーニング",
    youth_facilities: "ユース施設",
    youth_coaching: "ユース指導",
    youth_recruitment: "ユース獲得",
    corporate: "法人向け施設",
  },

  supporterTraits: {
    loyalty: "忠誠心",
    passion: "情熱",
    patience: "忍耐",
    affluence: "裕福さ",
    temperament: "気性",
    expectations: "期待",
  },

  supporterMix: {
    hardcore: "熱狂的",
    core: "コア",
    family: "ファミリー",
    fair_weather: "にわか",
    corporate: "法人",
    casual: "カジュアル",
  },

  jobs: {
    1: "選手",
    2: "コーチ",
    4: "会長",
    6: "役員",
    10: "フットボールディレクター",
    12: "フィジオ",
    14: "スカウト",
    16: "監督",
    20: "アシスタントコーチ",
    22: "セットプレーコーチ",
    26: "フィットネスコーチ",
    34: "GKコーチ",
    38: "チーフドクター",
    40: "スポーツ科学部門長",
    44: "チーフスカウト",
    46: "ドクター",
    48: "スポーツ科学者",
    50: "ヘッドフィジオ",
    58: "リクルートアナリスト",
    60: "パフォーマンスアナリスト",
    62: "チーフパフォーマンスアナリスト",
    64: "ユース育成責任者",
    66: "オーナー",
    70: "プレジデント",
    86: "ローンマネージャー",
    88: "テクニカルディレクター",
  },

  fields: {
    current_ability: "現在能力",
    potential_ability: "潜在能力",
    height: "身長 (cm)",
    date_of_birth: "生年月日",
    asking_price: "希望移籍金",
    nation: "国籍",
    city_of_birth: "出生地",
    "reputation.home": "国内評価",
    "reputation.current": "現在の評価",
    "reputation.world": "世界的評価",
    "international.caps": "代表出場数",
    "international.goals": "代表得点数",
    "international.u21_caps": "U21代表出場数",
    "international.u21_goals": "U21代表得点数",
    // What the game changes every day.
    condition: "コンディション",
    match_sharpness: "試合勘",
    jadedness: "疲労蓄積",
    morale: "士気",
    "contract.wage": "週給",
    wageShare: "給与の負担割合",
    monthlyFee: "月額レンタル料",
    optionFee: "買い取りオプション",
    "contract.loyalty_bonus": "週あたりのロイヤルティボーナス",
    "contract.happiness": "満足度",
    "contract.playing_time_happiness": "出場時間への満足度",
    "contract.unhappiness": "不満の理由",
    "contract.expires": "契約満了日",
    "contract.squad_number": "背番号",
    "contract.squad_status": "チーム内の立場",
    "contract.transfer_listed": "移籍リスト入り",
    "contract.loan_listed": "ローンリスト入り",
    "loan.expires": "ローン終了日",
    "loan.option_fee": "買い取りオプション",
    "contract.job": "職",
    "tie.nationality": "第2国籍",
    "tie.trainedInNation": "育成された国",
    "tie.trainedAtClub": "育成されたクラブ",
    "tie.workPermit": "労働許可が不要な国",
    club: "クラブ",
    injuries: "負傷",
    cohesion: "連携",
    tactics: "戦術理解度",
    bans: "出場停止",
    retirement: "引退",
    clause: "契約条項",
    "clause.amount": "条項の金額",
    "clause.condition": "条項の条件",
    captain: "キャプテン",
    vice_captain: "副キャプテン",
    reputation: "評価",
    "facilities.training": "トレーニング施設",
    "facilities.youth_facilities": "ユース施設",
    "facilities.youth_coaching": "ユース指導",
    "facilities.youth_recruitment": "ユース獲得",
    "facilities.corporate": "法人向け施設",
    "finance.balance": "残高",
    "finance.transfer_budget": "移籍予算",
    "finance.wage_budget": "給与予算",
    "finance.total_wage_budget": "給与予算の総額",
    "stadium.capacity": "スタジアム収容人数",
    "stadium.name": "スタジアム名",
    "name.first": "名",
    "name.last": "姓",
    "name.common": "通称",
    "name.full": "フルネーム",
    "stadium.seating": "座席数",
    "stadium.used": "使用中の収容人数",
    "stadium.expansion": "拡張後の収容人数",
    "prize.win": "リーグの賞金（勝利ごと）",
    "prize.draw": "リーグの賞金（引き分けごと）",
    "prize.loss": "リーグの賞金（敗戦ごと）",
  },

  profile: {
    close: "プロフィールを閉じる",
    loading: "プロフィールを読み込み中…",
    resize: "プロフィールパネルの幅を変更",
    resizeHint: "ドラッグでパネルの幅を変更、ダブルクリックで元に戻します",
    none: "—",

    // Header
    freeAgent: "フリーエージェント",
    born: "生年月日",
    height: (cm: number) => `${cm} cm`,
    heightUnit: "cm",
    uid: "UID",
    currentAbility: "現在能力",
    currentAbilityShort: "CA",
    potentialAbility: "潜在能力",
    potentialAbilityShort: "PA",
    potentialRange: "潜在能力が範囲で設定されています",

    // Attributes
    technical: "テクニカル",
    goalkeeping: "ゴールキーピング",
    mental: "メンタル",
    physical: "フィジカル",
    hidden: "隠し能力",
    feet: "利き足",
    personality: "性格",
    raw: (raw: number, scale = 100) => `内部値 ${raw} / ${scale}`,
    lowerIsBetter: "低いほど良い",
    age: (age: number) => `${age}歳`,

    // Positions
    positions: "ポジション",
    positionsSummary: (best: string) => `ポジション適性：${best}`,
    positionRatings: "ポジション適性",
    positionTiers: {
      natural: "本職",
      accomplished: "熟練",
      competent: "十分",
      unconvincing: "不安あり",
      ineffective: "不適",
    },
    positionTooltip: (position: string, rating: number, tier: string) => `${position} · ${rating} · ${tier}`,

    // Contract
    contract: "契約",
    wage: "週給",
    wageNote: (converted: boolean): string =>
      converted
        ? "ゲーム内の金額はポンド。FM の為替レートで換算して表示"
        : "ゲーム内の金額はポンド。設定で別の通貨を選べます",
    signed: "契約日",
    expires: "満了日",
    joined: "加入日",
    extendContract: (years: number) => `${years}年延長`,
    extendingContract: "延長中…",
    extendContractTitle: (years: number, until: string) => `契約を${years}年延長し、${until}までにします`,
    squadStatus: "チーム内の立場",
    squadStatusName: (status: number) => SQUAD_STATUSES[status] ?? `立場 ${status}`,
    contractType: "契約の種類",
    contractTypeName: (code: number) => CONTRACT_TYPES[code] ?? `種類 ${code}`,
    squadNumber: "背番号",
    transferListed: "移籍リスト入り",
    loanListed: "ローンリスト入り",

    // Career
    career: "経歴",
    internationalCaps: "代表出場数",
    internationalGoals: "代表得点数",
    u21Caps: "U21代表出場数",
    u21Goals: "U21代表得点数",
    askingPrice: "希望移籍金",
    notSet: "未設定",
    reputation: "評価",
    reputationHome: "国内",
    reputationCurrent: "現在",
    reputationWorld: "世界",
    retirement: "引退",
    retires: "引退予定",
    noRetirement: "ゲームはこの選手の引退を予定していません",
    keepPlaying: "引退を阻止",
    keepingPlaying: "阻止中…",
    keepPlayingTitle: "引退予定を取り消し、特性「できる限り長く現役を続ける」を与えます",

    // Medical
    morale: (value: number) => `${value} / 20`,
    traits: "特性",
    noTraits: "特性なし",
    traitName: (bit: number) => TRAIT_NAMES_JA[bit] ?? `特性 ${bit}`,
    unhappiness: "不満",
    noUnhappiness: "不満はありません",
    removeUnhappiness: "すべて解消",
    removingUnhappiness: "解消中…",
    removeUnhappinessTitle: "不満の理由をすべてリストから消します",
    removeUnhappinessFollows: "チームメイトの不満はゲームが進行すると消えます：ゲームで「続ける」を押してください",
    concernSince: (date: string) => `${date}から`,
    concernAbout: (name: string) => `${name}について`,
    concernKind: (kind: number) => (kind === 1 ? "懸念" : kind === 2 ? "内部" : `種類 ${kind}`),
    concernMotive: (concern: Concern) => reasonText(REASONS_JA, concern) ?? `理由 ${concern.motive}`,
    clauses: "ボーナスと条項",
    noClauses: "ボーナス・条項なし",
    loyaltyBonus: "ロイヤルティボーナス",
    happiness: "満足度",
    playingTimeHappiness: "出場時間への満足度",
    moodTitle: "FMRTE と同じく -100〜100 で表示します（ゲーム内では言葉で表示されます）",
    clauseName: (kind: number) => CLAUSE_NAMES_JA[kind] ?? `条項 ${kind}`,
    loan: "ローン",
    loanAt: "ローン先",
    loanParent: "保有クラブ",
    loanFrom: "開始",
    loanUntil: "終了",
    loanNumber: "ローン先の背番号",
    recall: "ローンから呼び戻す",
    recallTitle: "今日、所属クラブに呼び戻します。先に確認します",
    recallAgain: "もう一度呼び戻す",
    makePermanent: "完全移籍にする",
    makePermanentTitle: "ローン先のクラブと契約させ、そのまま残します。先に確認します",
    recalledWaiting: "呼び戻し済み · 復帰待ち",
    endsTodayWaiting: "本日終了 · 復帰待ち",
    pendingTitle: (parent: string) => `ローンは今日で終了：ゲームを1日進めると ${parent} に戻ります`,
    endPassed: (date: string) =>
      `ローンは ${date} に終了する予定でしたが、ゲームが選手を戻していません。もう一度呼び戻してから、1日進めてください。`,
    loanCanRecall: "呼び戻し可能",
    loanCanRecallTitle: "ゲーム内で所属クラブが呼び戻せるかどうか。ここでの「ローンから呼び戻す」はどちらでも使えます",
    loanCanTerminate: "途中解約可能",
    loanCupMatches: "カップ戦に出場可",
    loanAgainstClub: "保有クラブとの対戦に出場可",
    loanOptionFee: "買い取りオプション",
    loanOptionFeeTitle: "ローン先のクラブがこの選手を完全移籍で獲得できる金額",
    loanMonthlyFee: "月額レンタル料",
    loanMonthlyFeeTitle: "選手がプレーした月ごとに、ローン先のクラブが保有クラブに支払う金額",
    loanUnusedFee: "未起用時の月額レンタル料",
    loanUnusedFeeTitle: "選手を起用しなかった月ごとに、ローン先のクラブが保有クラブに支払う金額",
    clauseCondition: (kind: number, value: number) => {
      switch (kind) {
        case 10:
          return `${value}得点`;
        case 40:
          return `${value}アシスト`;
        case 41:
          return `得点とアシストで計${value}`;
        case 19:
          return `代表${value}試合出場`;
        case 11:
        case 13:
        case 25:
        case 26:
          return `リーグ戦${value}試合`;
        case 22:
        case 29:
          return `${value}年`;
        case 3:
        case 4:
        case 5:
        case 8:
        case 9:
        case 14:
        case 15:
        case 20:
        case 21:
          return `${value}%`;
        default:
          return String(value);
      }
    },
    clauseExpires: (date: string) => `${date}に失効`,
    clauseExpiresAfter: (days: number) => `契約から${format(days)}日後に失効`,
    clauseProfitShare: (percent: string, amount: string) => `${amount}を超える利益の${percent}`,
    clauseWage: (amount: string) => `週${amount}`,
    moraleTitle: "ゲームでの総合的な満足度：10で「満足」、11で「やや幸せ」、15と20で「非常に幸せ」",
    jadednessTitle: "試合出場による疲労の蓄積：-500で完全に休養済み、高いほど休養が必要です",
    noInjuries: "負傷なし",
    unknownInjury: "不明な負傷",
    injuryStarted: (date: string) => `${date}に負傷`,
    injuryBack: (dates: string) => `復帰予定 ${dates}`,
    heal: "治療",
    healTitle: "ゲーム内でこの選手の負傷をすべて治します",
    noBans: "出場停止なし",
    banMatches: (matches: number) => `${format(matches)}試合`,
    banStarted: (date: string) => `${date}から`,
    liftBans: "解除",
    liftBansTitle: "ゲーム内でこの選手の出場停止をすべて解除します",

    // Above the attributes, while the profile is read
    maxAttributes: "能力値を最大化",
    maxAttributesTitle: "能力値をすべて最高にします：20（負傷しやすさとラフプレーは1）",
    maxAttributesDone: (count: number) =>
      count === 0 ? "すべての能力値はすでに最高です" : `${changeCount(count)}を書き込みました`,
    maxAttributesUndone: (count: number) => (count === 0 ? "元に戻したものはありません" : `${changeCount(count)}を元に戻しました`),
    undoMax: "元に戻す",
    undoMaxTitle: "元の能力値をゲームに書き戻します",
    freezeAttributes: "能力値を固定",
    freezeAttributesNote: "アプリを開いて接続している間、能力値は下がりません。上がった分は残ります",
    maxStaffAttributesTitle: "このスタッフの能力値をすべて最高（20）にします",
    undoMaxStaffTitle: "元の能力値をゲームに書き戻します",
    freezeStaffAttributesNote: "アプリを開いて接続している間、能力値は下がりません。上がった分は残ります",
    freezeFitness: "コンディションと試合勘を固定",
    freezeFitnessNote: "アプリを開いて接続している間、コンディションと試合勘は下がりません。上がった分は残ります",
    freezePositions: "固定",
    freezePositionsInfo: "ポジションを固定するとどうなりますか？",
    freezePositionsNote:
      "アプリを開いて接続している間、ポジション適性はそのまま保たれます：新しいポジションを覚えることも、適性が上がったり" +
      "下がったりすることもありません。アプリはこのセーブについてこの設定を覚えています。",

    // Staff
    you: "あなた",
    youTitle: "このセーブであなたが操作している監督",
    id: "ID",
    job: "職",
    changeJob: "職を変更",
    changeJobTitle: "ゲーム内で、このスタッフにクラブでの別の職を与えます",
    newJob: "新しい職",
    applyJob: "適用",
    cancelJob: "キャンセル",
    unemployed: "無職",
    coaching: "コーチング",
    knowledge: "知識",
    medical: "メディカル",
    playerCoach: (job: string) => `${job}（選手兼任）`,
    unknownJob: (code: number) => `職 ${code}`,
  },

  playerList: {
    nav: "選手",
    count: (total: number) => `選手${format(total)}人`,
    search: "名前またはUIDで選手を検索",
    summary: (total: number, shown: number, sorted: { by: string; ascending: boolean } | null) => {
      const count = `選手${format(total)}人`;
      if (total <= shown) {
        return count;
      }
      return sorted === null
        ? `${count} · 現在能力の上位${shown}人を表示`
        : `${count} · ${sorted.by}の${sorted.ascending ? "昇順" : "降順"}で先頭${shown}人を表示`;
    },
    empty: (query: string, filtered: boolean) => {
      if (query === "") {
        return filtered ? "このフィルターに一致する選手はいません。" : "選手が見つかりません。";
      }
      return filtered
        ? `このフィルターで「${query}」に一致する選手はいません。`
        : `「${query}」に一致する選手はいません。`;
    },
    columns: {
      name: "名前",
      age: "年齢",
      positions: "ポジション",
      nation: "国籍",
      club: "クラブ",
      contractExpires: "契約",
      born: "生年月日",
      currentAbility: "CA",
      potentialAbility: "PA",
      uid: "UID",
    },
    sortBy: (by: string) => `${by}で並べ替え`,
    sortNames: {
      currentAbility: "現在能力",
      potentialAbility: "潜在能力",
      age: "年齢",
      name: "名前",
      nation: "国籍",
      club: "クラブ",
      contractExpires: "契約満了日",
    },
    filters: {
      toggle: "フィルター",
      toggleActive: (count: number) => `フィルター（${count}件有効）`,
      clear: "クリア",
      any: "すべて",
      position: "ポジション",
      gender: "性別",
      men: "男子",
      women: "女子",
      age: "年齢",
      minAge: "最低年齢",
      maxAge: "最高年齢",
      minPlaceholder: "最小",
      maxPlaceholder: "最大",
      minCurrentAbility: "最低CA",
      minCurrentAbilityTitle: "現在能力の最低値",
      minPotentialAbility: "最低PA",
      minPotentialAbilityTitle: "潜在能力の最低値",
      abilityPlaceholder: "1–200",
      nation: "国籍",
      club: "クラブ",
      freeAgentsOnly: "フリーエージェントのみ",
      contractEndsBy: "契約満了がこの日まで",
      transferListedOnly: "移籍リスト入りのみ",
      loanListedOnly: "ローンリスト入りのみ",
      attributes: {
        heading: "能力値",
        attribute: "能力値",
        pick: "能力値を選択",
        min: (name: string) => (name ? `${name}の最小` : "最小"),
        max: (name: string) => (name ? `${name}の最大` : "最大"),
        add: "能力値を追加",
        remove: (name: string) => (name ? `${name}を削除` : "この行を削除"),
      },
      saved: {
        save: "保存",
        saveTitle: "現在のフィルターと並び順に名前をつけて保存します",
        name: "保存するフィルターの名前",
        namePlaceholder: "フィルター名",
        ok: "OK",
        cancel: "キャンセル",
        select: "保存したフィルター",
        delete: "削除",
        deleteTitle: (name: string) => `保存したフィルターを削除：${name}`,
        replaceQuestion: (name: string) => `「${name}」という名前のフィルターはすでにあります。置き換えますか？`,
        replace: "置き換える",
        full: (max: number) =>
          `保存できるフィルターは${max}件までです。先に1つ削除するか、保存済みのフィルター名を使って置き換えてください。`,
      },
    },
  },

  staffList: {
    nav: "スタッフ",
    count: (total: number) => `スタッフ${format(total)}人`,
    search: "名前またはIDでスタッフを検索",
    summary: (total: number, shown: number, sorted: { by: string; ascending: boolean } | null) => {
      const count = `スタッフ${format(total)}人`;
      if (total <= shown) {
        return count;
      }
      return sorted === null
        ? `${count} · 現在能力の上位${shown}人を表示`
        : `${count} · ${sorted.by}の${sorted.ascending ? "昇順" : "降順"}で先頭${shown}人を表示`;
    },
    empty: (query: string, filtered: boolean) => {
      if (query === "") {
        return filtered ? "このフィルターに一致するスタッフはいません。" : "スタッフが見つかりません。";
      }
      return filtered
        ? `このフィルターで「${query}」に一致するスタッフはいません。`
        : `「${query}」に一致するスタッフはいません。`;
    },
    columns: {
      name: "名前",
      age: "年齢",
      job: "職",
      club: "クラブ",
      nation: "国籍",
      born: "生年月日",
      currentAbility: "CA",
      potentialAbility: "PA",
      id: "ID",
    },
    sortBy: (by: string) => `${by}で並べ替え`,
    sortNames: {
      currentAbility: "現在能力",
      potentialAbility: "潜在能力",
      age: "年齢",
      name: "名前",
      nation: "国籍",
      club: "クラブ",
    },
    filters: {
      job: "職",
      anyJob: "すべて",
      unemployedOnly: "無職のみ",
    },
  },

  clubProfile: {
    // Header
    womensClub: "女子クラブ",
    founded: (year: number) => `${year}年創立`,
    reputationShort: "評価",
    reputationTitle: "評価",

    tabsLabel: "クラブの項目",
    tabs: { overview: "概要", squad: "スカッド", staff: "スタッフ", stadium: "スタジアム" },
    squadLocked: "スカッドを開くには編集を終了してください",
    staffLocked: "スタッフを開くには編集を終了してください",

    facilities: "施設",

    // Supporters
    supporters: "サポーター",
    supporterMix: "サポーターの内訳",
    percent: (value: number) => `${percents.format(value)}%`,
    mixTooltip: (kind: string, percent: string) => `${kind} · ${percent}`,

    // Finances
    finances: "財務",
    balance: "残高",
    transferBudget: "移籍予算",
    wageBudget: "給与予算（支出）",
    totalWageBudget: "給与予算の総額",
    ticketPrice: "平均チケット価格",
    perWeek: "週あたり",
    noFinances: "FM はプレー中のリーグに所属するクラブの財務しか保持していません。",
    freeze: "資金を固定",
    freezeNote: "アプリを開いて接続している間、残高は減りません。収入は加算されます",

    // Stadium
    stadium: "スタジアム",
    capacity: "収容人数",
    seating: "座席数",
    used: "使用中",
    usedAll: "すべて",
    usedTitle: "ゲームが制限しているときに入場を許可している収容人数。0はすべてを意味します",
    expansion: "拡張可能な上限",
    noStadium: "このクラブのスタジアムを読み取れませんでした。",
    stadiumName: "名前",
    rename: "名前を変更",
    renameTitle: "スタジアムに別の名前をつけます。すぐに書き込まれます",
    renameInfoLabel: "名前の変更はどのように働きますか？",
    renameInfo:
      "ゲームはセーブデータにスタジアム名を保存せず、セーブを読み込むたびにデータベースから取得します。そのため " +
      "FMLibreEditor はこのセーブ用に新しい名前を覚えておき、アプリを開いて接続している限り、ゲームがセーブを読み込むたびに" +
      "数秒以内に新しい名前を戻します。アプリを閉じている間にゲームがセーブを読み込むと、次にアプリが接続するまでは元の名前が" +
      "表示されます。元の名前に戻すには、変更履歴で名前の変更を元に戻すか、スタジアム名を変更し直してください。",
    saveName: "保存",
    renaming: "保存中…",
    cancelRename: "キャンセル",
    nameLength: (bytes: number, min: number, max: number) =>
      min <= 1
        ? `${bytes} / 最大${max}バイト（UTF-8：アクセント付き文字は2、日本語の文字は3として数えます）`
        : `${bytes}バイト：ゲームが名前を保管する場所に収まるよう${min}〜${max}バイトにしてください（UTF-8：日本語の文字は3として数えます）`,
    nameShared: (holders: number) =>
      `ゲーム内の${holders}件がこの名前を共有しているため、スタジアムだけの名前を変えることはできません`,

    // Club info
    info: "クラブ情報",
    seasonTickets: "シーズンチケット",
    socialMedia: "SNSフォロワー",
  },

  clubStaff: {
    loading: "スタッフを読み込み中…",
    empty: "ゲームはこのクラブのスタッフを保持していません：このセーブでプレイされていないリーグのクラブにはスタッフがいません。",
    count: (total: number, staying: number) =>
      staying === 0 ? `スタッフ${format(total)}人` : `スタッフ${format(total)}人・ほかを解除しても${format(staying)}人は残ります`,

    actionsLabel: "スタッフ全体への操作",
    releaseAll: (count: number) => (count === 0 ? "全スタッフの契約解除" : `全スタッフの契約解除（${format(count)}人）`),
    releaseAllTitle: "あなたと役員会を除く、クラブの全スタッフの契約を解除します。先に確認します",
    releaseNone: "このクラブには契約解除できるスタッフがいません",
    hint: "あなたと役員会以外の全員がすぐにクラブを離れます。元に戻す操作は変更履歴でも行えます。",
    released: (count: number) => `スタッフ${format(count)}人の契約を解除しました`,
    refused: (name: string, reason: string) => `${name}：${reason}`,
    undo: "元に戻す",
    undoTitle: "契約解除したスタッフを、同じ契約のままクラブに戻します",

    tableLabel: "クラブのスタッフ",
    staysColumn: "残留",
    stays: {
      you: "あなた",
      board: "役員会",
      player: "選手でもある",
      held: "クラブが別の形で保持",
      other: "解除できません",
    },

    title: "全スタッフの契約解除",
    from: "クラブ",
    leaving: (count: number) => `${format(count)}人がクラブを離れます`,
    staying: (count: number) => `${format(count)}人が残ります`,
    more: (count: number) => `ほか${format(count)}人`,
    doesHeading: "行われること",
    does: [
      "各スタッフはすぐにクラブのスタッフから外れ、契約が終了します：ゲーム自身の所属クラブのないスタッフと同じく無職になります",
      "誰にも何も支払われません",
      "監督やフットボールディレクターの座は空席となり、クラブが補充します",
      "あなた、役員会、エディターが解除できない人は残ります",
      "変更履歴に記録され、1回の取り消しで全員を同じ契約のまま戻せます",
    ],
    dialogHint: "「全員解除」を押すまで、ゲーム内では何も変わりません。",
    release: "全員解除",
    releasing: "契約解除中…",
    cancel: "キャンセル",

    moveAll: "全スタッフの移籍",
    moveAllTitle: "あなたと役員会を除く、クラブの全スタッフを別のクラブへ移籍させます。先に確認します",
    moveNone: "このクラブには移籍できるスタッフがいません",
    moved: (count: number, club: string) => `スタッフ${format(count)}人が${club}に移籍しました`,
    undoMoveTitle: "移籍したスタッフを、同じ契約のままこのクラブに戻します",
    moveTitle: "全スタッフの移籍",
    moveSearch: "スタッフの移籍先クラブを検索",
    movePick: "スタッフの移籍先クラブを選んでください。",
    movePlanning: "移籍できる人を確認中…",
    movePlan: (count: number, club: string) => `スタッフ${format(count)}人が${club}に移籍します`,
    moveNobody: (club: string) => `このクラブのスタッフに、${club}へ移籍できる人はいません。`,
    moveStays: {
      managerTaken: (club: string) => `${club}にはすでに監督がいます`,
      directorTaken: (club: string) => `${club}にはすでにフットボールディレクターがいます`,
      yourClub: (club: string) => `あなたが${club}を率いています`,
      other: "移籍できません",
    },
    moveDoes: [
      "各スタッフは、新しいクラブのその職がある部門（メディカル・コーチ・スカウト）に加わります",
      "職、週給、契約満了日は同じで、各契約はゲーム内の日付から始まります",
      "監督やフットボールディレクターは、新しいクラブのその座が空いている場合だけ加わります。こちらで空いた座は" +
        "空席のままで、クラブが補充します",
      "あなた、役員会、エディターが移籍させられない人は残ります",
      "変更履歴に記録され、1回の取り消しで全員をこのクラブに戻せます",
    ],
    moveHint: "「全員移籍」を押すまで、ゲーム内では何も変わりません。",
    move: "全員移籍",
    moving: "移籍中…",
  },

  clubList: {
    nav: "クラブ",
    count: (total: number) => `${format(total)}クラブ`,
    search: "名前またはUIDでクラブを検索",
    summary: (total: number, shown: number) =>
      total > shown ? `${format(total)}クラブ · 評価の上位${shown}クラブを表示` : `${format(total)}クラブ`,
    empty: (query: string, filtered: boolean) => {
      if (query === "") {
        return filtered ? "このフィルターに一致するクラブはありません。" : "クラブが見つかりません。";
      }
      return filtered
        ? `このフィルターで「${query}」に一致するクラブはありません。`
        : `「${query}」に一致するクラブはありません。`;
    },
    women: "女子",
    columns: {
      name: "名前",
      nation: "国",
      league: "リーグ",
      reputation: "評価",
      founded: "創立",
      uid: "UID",
    },
    filters: {
      kind: "表示するクラブ",
      all: "すべてのクラブ",
      men: "男子クラブ",
      women: "女子クラブ",
      nation: "国",
      league: "リーグ",
      anyLeague: "すべてのリーグ",
      leagueTitle: "トップチームが今シーズン戦うリーグ",
      reputation: "評価",
      reputationTitle: "ゲーム内の値で 0～10,000",
      minReputation: "評価の下限",
      maxReputation: "評価の上限",
    },
  },
  /** The Clubs tab's national teams: each nation's men's and women's team, its senior team's squad and reputation. */
  national: {
    /** The button of the Clubs tab's switch that lists them, and the palette's command to go there. */
    nav: "代表チーム",
    switchLabel: "クラブまたは代表チーム",
    search: "名前、コード、UIDで代表チームを検索",
    summary: (total: number, shown: number) =>
      total > shown ? `代表チーム：${format(total)} · 評価の上位${shown}チームを表示` : `代表チーム：${format(total)}`,
    /** The message under an empty table; `filtered` is whether a filter is in effect. */
    empty: (query: string, filtered: boolean) => {
      if (query === "") {
        return filtered ? "このフィルターに一致する代表チームはありません。" : "代表チームが見つかりません。";
      }
      return filtered ? `このフィルターで「${query}」に一致する代表チームはありません。` : `「${query}」に一致する代表チームはありません。`;
    },
    /** The small tag on a women's team. */
    women: "女子",
    columns: {
      name: "国",
      code: "コード",
      reputation: "評価",
      players: "選手",
      uid: "UID",
    },
    filters: {
      /** The label of the select of which teams to show. */
      kind: "表示するチーム",
      all: "すべてのチーム",
      men: "男子代表",
      women: "女子代表",
    },
    /** In the header of a profile, by the name. */
    womensTeam: "女子代表チーム",
    mensTeam: "男子代表チーム",
    reputationShort: "評価",
    reputationTitle: "トップチームの評価（0〜10,000）",
    teamKinds: { 0: "トップチーム", 9: "U-23", 10: "U-21", 18: "U-20", 11: "U-19", 12: "U-18" },
    teamType: (kind: number) => `タイプ ${kind}`,
    teamsLabel: "この国のチーム",
    teamReputation: (team: string) => `評価（${team}）`,
    teamReputationTitle: "このチームの評価（0〜10,000）",
    squadHeading: (team: string, count: number) => `${team}：${format(count)}人`,
    squadLabel: (team: string) => `代表チームの選手：${team}`,
    squadNote: "ゲームがこのチームに載せている選手を、ゲームの順に表示します。招集、キャプテン、監督の契約はここでは編集しません。",
    details: {
      nation: "国",
      founded: "協会の設立",
      continent: "大陸",
      staff: (count) => `協会のスタッフ (${format(count)})`,
      noStaff: "協会のスタッフは見つかりません。",
      job: "代表チームでの職務",
      team: "チーム",
      staffNote: "ゲームから読み取ったもので、ここでは編集しません。職務はクラブではなく代表チームでのものです。",
    },
    actionsHint: "操作はトップチームに載っている全選手が対象です。元に戻す操作は変更履歴でも行えます。",
    noTeams: "ゲームにはこの代表のチームがないため、表示できる選手や評価はありません。",
    reading: "選手を読み込み中…",
    noPlayers: "ゲームはこのチームに選手を載せていません。",
    /** Where the tab cannot show national teams: why, for a version of the game the editor has not been checked with. */
    unavailableTitle: "このバージョンのゲームでは代表チームを利用できません",
    unavailableBuild: "このバージョンのゲームが代表チームをどこに持っているかはまだ誰も見つけていないため、誤ったメモリを読まないよう、エディターは何も表示しません。",
    unavailableUnreadable: "エディターはこのバージョンのゲームで代表チームがあるはずの場所を調べましたが、見つかったものがゲームのデータとは読み取れないため、何も表示しません。",
  },

  leaguePrizes: {
    title: "リーグの賞金",
    league: (league) => `${league}が今シーズン支払う額`,
    reading: "リーグの賞金をゲームから読み込んでいます… 初回は30秒以上かかることがあります。",
    readAgain: "再読み込み",
    readAgainTitle: "ゲームから金額を読み込み直します。その後に始まったステージにも賞金があるかもしれません",
    paysNothing: "このクラブのリーグは今シーズン、最終順位別にも試合ごとにも賞金を支払いません。",
    stageStarted: "進行中のステージ",
    stageFuture: "未開始のステージ",
    alike: (count) => `${format(count)}のグループまたはステージで同じ金額`,
    byPosition: "最終順位別",
    place: (place) => `${format(place)}位`,
    perMatch: "試合ごと",
    win: "勝利ごと",
    draw: "引き分けごと",
    loss: "敗戦ごと",
    noList: "最終順位による賞金はありません。",
    noPerMatch: "試合ごとの賞金はありません。",
    note: "決勝の勝者・敗者などノックアウトラウンドの賞金と大会の参加報酬はまだ読み込みません。",
    unavailableBuild: "このバージョンのゲームが賞金をどこに保持しているか、まだ誰も確認していません。誤ったメモリを読まないよう、エディターは何も表示しません。",
    unavailableUnreadable: "エディターはこのバージョンのゲームで賞金があるはずの場所を調べましたが、見つかったものはゲームのものとして読めないため、何も表示しません。",
    edit: "金額を変更",
    editTitle: "リーグのこのステージが支払う額を、参加するすべてのクラブについて変更します",
    save: "金額を保存",
    saving: "保存中…",
    cancel: "キャンセル",
    everyClub: (league) =>
      `${league}が参加するすべてのクラブに支払う額が変わります（このクラブだけではありません）。ゲームはセーブデータに保持しますが、今シーズンのみです。次のシーズンは自身の金額で設定し直します。変更履歴の「元に戻す」で元の金額に戻せます。`,
    infoLabel: "賞金の変更が続く期間",
    invalid: (most) => `0から${most}までの整数の金額を入力してください。`,
    allNothing: "何も支払わないステージは一覧に表示されなくなります。少なくとも1つの金額を0より大きくしてください。",
    placeField: (place) => `リーグの賞金（${format(place)}位）`,
    changedIn: (league, groups) =>
      groups > 1 ? `${league}のすべてのクラブ（${format(groups)}グループ）` : `${league}のすべてのクラブ`,
  },

  sponsorships: {
    title: "スポンサー契約",
    reading: "クラブのスポンサー契約を読み込み中…",
    none: "このクラブにはスポンサー契約がありません。",
    perSeason: "1シーズンあたり",
    total: "総額",
    term: "期間",
    years: (count) => `${format(count)}年`,
    unnamed: (kind) => `タイプ${format(kind)}`,
    unnamedTitle: "この種類の契約は、ゲーム画面上の名前とまだ照合されていません",
    ended: "終了",
    endedTitle: "ゲーム内の日付より前に終了：ゲームのスポンサー画面にはもう表示されません",
    falls: (percent) => `降格すると${format(percent)}%減額`,
    rises: (percent) => `トップディビジョンに昇格すると${format(percent)}%増額`,
    note: "読み取り専用です。ゲームが各契約に保存している金額です。ゲームのスポンサー画面には終了していない契約が表示されます。",
    unavailableBuild: "このバージョンのゲームがスポンサー契約をどこに保存しているかはまだ確認されていないため、誤ったメモリを読まないよう表示しません。",
    unavailableUnreadable: "このバージョンのゲームで想定される場所からスポンサー契約を探しましたが、見つかったものがゲームのデータとして読めないため、表示しません。",
  },

  competitions: {
    nav: "大会",
    search: "名前、国、UIDで大会を検索",
    summary: (total: number, shown: number) =>
      total > shown ? `${format(total)}大会中${format(shown)}大会` : `${format(total)}大会`,
    empty: (query: string, filtered: boolean) => {
      if (query === "") {
        return filtered ? "この国にスカッドルールのある大会はありません。" : "スカッドルールのある大会が見つかりません。";
      }
      return filtered ? `この国で「${query}」に一致する大会はありません。` : `「${query}」に一致する大会はありません。`;
    },
    reading: "ゲームから大会のスカッドルールを読み込んでいます… 数秒かかります。",
    readAgain: "再読み込み",
    readAgainTitle: "ゲームからルールを読み込み直します",
    listNote: "このセーブでゲームが行っている大会だけを表示します。",
    unavailableTitle: "表示できるスカッドルールがありません",
    unavailableBuild: "このバージョンのゲームが大会のスカッドルールをどこに保持しているか、まだ誰も確認していません。誤ったメモリを読まないよう、エディターは何も表示しません。",
    unavailableUnreadable: "エディターはこのバージョンのゲームでスカッドルールがあるはずの場所を調べましたが、見つかったものはゲームのものとして読めないため、何も表示しません。",
    columns: {
      name: "大会",
      nation: "国",
      level: "レベル",
      rules: "ルール",
      uid: "UID",
    },
    level: (level: number) => format(level),
    rulesCount: (current: number, next: number | null) =>
      next === null || next === current ? format(current) : `${format(current)} · ${format(next)}`,
    rulesCountTitle: "今シーズンのスカッドルールの数。来シーズンで数が異なる場合はその数も表示します",
    international: "国際",
    filters: {
      nation: "国",
      allNations: "すべての国",
    },
    title: "スカッドルール",
    intro: "この大会で、スカッドに登録できる、またはチームが1試合で選べる、ある種類の選手の人数です。外国籍やホームグロウンに数えられる選手はゲーム自身が決めます。",
    seasons: { current: "今シーズン", next: "来シーズン" },
    began: (year: number) => `${year}年に開始`,
    begins: (year: number) => `${year}年に開始予定`,
    noRules: "スカッドルールはありません。",
    noNext: "ゲームに来シーズンのルールはありません。",
    noneGiven: "ゲームはこの大会にスカッドルールを設けていないため、ここで変更できるものはありません。",
    ruleColumns: {
      rule: "ルール",
      where: "カウント対象",
      limit: "制限",
      value: "選手",
    },
    atMost: "最大",
    atLeast: "最低",
    scopes: {
      squad: "スカッド",
      matchSquad: "試合登録メンバー",
      eleven: "出場11人",
      startingEleven: "先発11人",
      bench: "ベンチ",
    },
    who: {
      squadSize: "スカッドの選手",
      foreign: "外国籍選手",
      foreignExceptAsian: "外国籍選手（アジア人を除く）",
      foreignGoalkeepers: "外国籍ゴールキーパー",
      nonEu: "EU圏外の選手",
      domestic: "自国籍選手",
      domesticGoalkeepers: "自国籍ゴールキーパー",
      goalkeepers: "ゴールキーパー",
      outfield: "フィールドプレーヤー",
      nonHomegrown: "ホームグロウンでない選手",
      youthContract: "ユース契約の選手",
      fullTime: "フルタイム契約の選手",
      amateur: "アマチュア選手",
      youthOrAmateur: "ユースまたはアマチュアの選手",
      trialists: "テスト生",
      loans: "レンタル選手",
      internationals: "代表選手",
      otherTeam: "他チームに登録された選手",
      firstTeam: "トップチームに登録された選手",
      over: (age: number) => `${format(age)}歳超の選手`,
      under: (age: number) => `${format(age)}歳未満の選手`,
      domesticUnder: (age: number) => `${format(age)}歳未満の自国籍選手`,
      foreignOver: (age: number) => `${format(age)}歳超の外国籍選手`,
      goalkeepersOver: (age: number) => `${format(age)}歳超のゴールキーパー`,
      outfieldOver: (age: number) => `${format(age)}歳超のフィールドプレーヤー`,
      homegrown: (from: "club" | "nation" | "clubOrNation", fromAge: number, toAge: number) => {
        const ages = `${format(fromAge)}–${format(toAge)}歳で育成`;
        if (from === "club") {
          return `クラブのホームグロウン（${ages}）`;
        }
        return from === "nation" ? `国のホームグロウン（${ages}）` : `クラブまたは国のホームグロウン（${ages}）`;
      },
      homegrownUnder: (age: number, fromAge: number, toAge: number) =>
        `国のホームグロウンの${format(age)}歳未満の選手（${format(fromAge)}–${format(toAge)}歳で育成）`,
    },
    unnamedKind: (kind: number) => `種類${format(kind)}のルール`,
    gameKey: (key: string) => `ゲーム内でのこのルールの名前：${key}`,
    teamsFrom: (competition: string) => `${competition}のチーム`,
    teamsFromUnknown: "別のディビジョンのチーム",
    condition: (code: string) => `条件付き（${code}）`,
    conditionTitle: "ゲームはこのルールを独自の条件で適用しますが、エディターはまだその条件を説明していません。",
    years: (from: number | null, to: number | null) => {
      if (from !== null && to !== null) {
        return from === to ? `${from}` : `${from}–${to}`;
      }
      return from !== null ? `${from}年以降` : `${to}年まで`;
    },
    yearsTitle: "国のルールがこのルールを適用するシーズン（シーズンが始まる年で表示）",
    leftAlone: "変更しません",
    notSavedTitle: "セーブにこのルールがなく、変更は読み込むと消えるため、エディターは変更しません",
    notACountTitle: "選手数ではなく金額です。エディターは変更しません。",
    noneChangeable: "これらのルールは、時期にかかわらずまだ変更できません。エディターは、セーブが保持するルールの中にも同じルールが見つかった場合にのみ変更します（セーブを読み込んでも変更が残るようにするためです）が、この大会のルールはそこに見つかっていません。現時点では、女子リーグ、メジャーリーグサッカー、一部のカップ戦が該当します。",
    unsavedNote: "ゲームはこの大会のルールをどのセーブにも保持しません。セーブを読み込むたびに、また新しいシーズンのたびに、ゲーム自身が作り直します。そのためエディターはここでの変更を保持します：実行中のゲームに書き込み、このキャリア用に記憶し、接続するたび、またはデータを再読み込みするたびに書き直します。セーブを読み込んだ後は、変更を戻すためにエディターを一度接続してください（または「データを再読み込み」を押してください）。「変更履歴」の「元に戻す」で保持を解除できます。",
    heldTag: "保持中",
    heldTitle: (original: number) =>
      `エディターがこの人数を保持し、ゲームを読み込むたびに書き直します。ゲーム本来の値は${format(original)}`,
    savedDiffers: (value: number) => `セーブのルールでは${format(value)}`,
    savedDiffersTitle: "ゲームはリストに従い、読み込み時にセーブのルールからリストを作ります。ここでの変更は両方に反映されます",
    edit: "ルールを変更",
    editTitle: "この大会のスカッドルールの人数を変更します",
    save: "ルールを保存",
    saving: "保存中…",
    cancel: "キャンセル",
    invalid: (most: number) => `0から${format(most)}までの整数を入力してください。`,
    shared: (names: string) => `このルールは${names}のルールでもあります。変更はそちらにも適用されます。`,
    currentNote: (turn: string | null) =>
      `ここでの変更は今シーズンの終わりまで有効です${turn === null ? "" : `（シーズンは${turn}に切り替わります）`}。ゲームはスカッドの人数を変更後の値ですぐに数えます。ゲーム自身の画面には1日経つと反映されます。`,
    nextNote: (turn: string | null) =>
      `ここでの変更は、シーズンが切り替わると${turn === null ? "" : `（${turn}）`}今シーズンのルールになり、それより後のシーズンにゲーム独自のルールがない限り、その後のシーズンにも残ります。ゲームの来シーズンのページにはすぐに表示されます。`,
    lasts: "変更は、ゲームが従うリストと、セーブが保持する国のルールの両方に書き込まれるため、セーブを読み込んでも残ります。今シーズンのルールへの変更はシーズンの切り替わりで終わり、来シーズンのルールに置き換わります。「変更履歴」の「元に戻す」で元の人数に戻せます。",
    infoLabel: "スカッドルールの変更はどう保持されるか",
    ruleField: (season: string, rule: string) => `スカッドルール、${season}：${rule}`,
    alsoFor: (count: number) =>
      count === 1 ? "同じルールの他の1大会にも適用" : `同じルールの他の${format(count)}大会にも適用`,
  },
  app: {
    stage: "ベータ",
    settingsLabel: "設定",
    languageLabel: "言語",
    currencyLabel: "通貨",

    noteEditable: "編集内容は「適用」したときにだけゲームに反映されます。先にセーブデータをバックアップしてください。",
    noteReadOnly: "読み取り専用：Windows が FMLibreEditor にゲームへの書き込みを許可しませんでした。",
    noteUnknownBuild: "読み取り専用：このバージョンのゲームは FMLibreEditor にとって未確認です。",
    noteNotConnected: "編集して適用するまで、ゲーム内では何も変わりません。",

    notConnected: "未接続",
    previewTag: "ブラウザプレビュー · サンプルデータ",
    noDate: "ゲーム内の日付なし",
    noDateTitle: "ゲーム内の日付を読み取れず、年齢は表示されず年齢フィルターも機能しません。アップデートを確認してください。",
    reload: "データを再読み込み",
    refresh: "更新",
    detecting: "Football Manager を探しています…",
    connecting: "選手・スタッフ・クラブを読み込み中…",
    reloading: "選手・スタッフ・クラブを再読み込み中…",

    saveChanged: {
      title: "ゲームのセーブデータが変わりました",
      text:
        "FMLibreEditor が読み取った後に、ゲームがセーブデータを読み込んだか、メインメニューに戻りました。データを再読み込み" +
        "するまで、ゲーム内では何も変更せず、固定も行いません：表示中の内容は別のセーブのものかもしれません。",
    },

    refrozen: {
      title: "前回の固定を再開しました",
      waitingTitle: "固定は保留中です",
      players: (names: string) => `能力値：${names}`,
      staff: (names: string) => `スタッフの能力値：${names}`,
      clubs: (names: string) => `資金：${names}`,
      fitness: (names: string) => `コンディションと試合勘：${names}`,
      positions: (names: string) => `ポジション：${names}`,
      stadiums: (names: string) => `スタジアム名：${names}`,
      more: (count: number) => `ほか${format(count)}件`,
      waiting: (count: number) =>
        `${format(count)}件は記憶されていますが、現在は固定されていません：FMLibreEditor はこのバージョンのゲームにまだ` +
        "書き込めません。",
      dismiss: "閉じる",
    },

    freezeInfo: {
      label: "固定はどのように働きますか？",
      note:
        "固定はゲームを恒久的に変えるものではありません：FMLibreEditor が2秒ごとに、ゲームが変えた値を元に戻します。そのため" +
        "アプリを開いて接続している間だけ働きます。アプリを閉じると、ゲームは再び値を変えます。アプリはこのセーブで固定して" +
        "いるものを覚えていて、次に接続したときに再び固定します。",
    },

    connect: {
      title: "Football Manager 27 に接続",
      intro: "FMLibreEditor は実行中のゲームのメモリを読み取ります。ゲームを起動してセーブデータを読み込んでから、接続してください。",
      notRunning: "Football Manager 27 が起動していません。",
      openFailed: (error: string) => `ゲームを開けませんでした：${error}`,
      game: "ゲーム",
      gameData: "ゲームデータ",
      loaded: "読み込み済み",
      stillLoading: "読み込み中です。メインメニューが出るまでお待ちください",
      process: "プロセス",
      pid: (pid: number) => `pid ${pid}`,
      several: "ゲームが複数起動しています。最初のものを使います。",
      button: "接続して選手・スタッフ・クラブを読み込む",

      bridge: {
        title: "ブリッジ（macOS）",
        intro:
          "macOS ではアプリが他のアプリのメモリに入ることはできないため、FM27 自身にメモリを渡してもらう必要があります。" +
          "FM27 は FMLibreEditor のブリッジを読み込むとそうします：ブリッジはゲームに何もフックせず何も変更しない小さな" +
          "ライブラリで、メモリをこのアプリにだけ渡します。Steam の起動オプションで FM27 に読み込ませます。",
        library: "ブリッジ",
        installed: "インストール済み",
        missing: "未インストール",
        launchOption: "起動オプション",
        set: "Steam に設定済み",
        notSet: "未設定",
        ready: "設定完了。Steam から FM27 を起動し（起動中なら一度終了して起動し直し）、セーブデータを読み込んでから接続してください。",
        steamRunning:
          "Steam が起動中で、起動中は起動オプションを保持します。起動オプションを自動で設定するには Steam を終了するか、" +
          "Steam で直接入力してください。",
        setUp: "ブリッジを設定",
        remove: "ブリッジを削除",
        manual: "または Steam で Football Manager 27 を右クリック › プロパティ › 一般 › 起動オプション に次を入力：",
        copy: "コピー",
        copied: "コピーしました",
      },
    },
  },

  graphics: {
    reading: "グラフィックパックを読み込み中…",
    summary: ({ clubLogos, flags, faces }) =>
      `グラフィック：クラブロゴ ${format(clubLogos)} · 国旗 ${format(flags)} · 顔写真 ${format(faces)}`,
    none: "グラフィックパックが見つかりません",
    noneHint: "ロゴや顔写真のパックは FM27 の graphics フォルダに入れます。",
  },

  compatibility: {
    unknownBuild: (game: string) => `FMLibreEditor は ${game} ではまだ確認されていません`,
    unknownBuildText:
      "ゲームがアップデートされた可能性があります。FMLibreEditor はゲームのデータを見つけて検査しましたが、テストされていない" +
      "バージョンには、許可するまで書き込みません。新しい FMLibreEditor は通常、数日以内に公開されます。",
    failedTitle: "ゲームのデータの一部が検査に合格しませんでした",
    reloadHint: "セーブの読み込み中だった場合は、「データを再読み込み」で再度検査します。",
    noDate: "ゲーム内の日付が検査に合格しなかったため、年齢は表示されません。",
    failed: (names: string) => `読み取り専用：${names}。`,
    failedCheck: (name: string, fit: number, sampled: number) => `${name}（${format(sampled)}件中${format(fit)}件が適合）`,
    join: (names: string[]) => names.join("、"),
    allow: "それでも編集する",
    allowTitle: "アプリを閉じるか再接続するまで編集を有効にします。先にセーブデータをバックアップしてください。",
  },

  diagnostics: {
    copy: "診断情報をコピー",
    copyTitle: "アプリがゲーム内で見つけた内容をバグ報告用にコピーします。名前やパスは含みません",
    copied: "コピーしました",
    failed: (reason: string) => `診断情報をコピーできませんでした：${reason}`,
  },

  checks: {
    gameDate: "ゲーム内の日付",
    players: "選手の詳細",
    positions: "ポジション",
    attributes: "能力値",
    personality: "性格",
    liveValues: "コンディション・試合勘・疲労蓄積・士気",
    contracts: "契約",
    teams: "チーム",
    staff: "スタッフ",
    clubs: "クラブ",
    cohesion: "クラブとの連携",
    tactics: "戦術理解度",
  },

  update: {
    available: (version: string) => `FMLibreEditor ${version} が利用可能です`,
    youHave: (version: string) => `現在のバージョンは ${version} です。`,
    download: "ダウンロード",
    install: "アップデート",
    installTitle: "新しいバージョンをダウンロードしてインストールします。アプリは終了し、新しいバージョンで再び開きます",
    preparing: "準備中…",
    downloading: (percent: number | null) => (percent === null ? "ダウンロード中…" : `ダウンロード中… ${percent}%`),
    installing: "インストール中：FMLibreEditor は終了し、新しいバージョンで再び開きます。",
    installFailed: (reason: string) => `アップデートできませんでした：${reason}。代わりにダウンロードページから入手してください。`,
    notInstallable: "このバージョンはここからインストールできません。代わりにダウンロードページから入手してください。",
    later: "後で",
    check: "アップデートを確認",
    checking: "アップデートを確認中…",
    upToDate: "最新バージョンです。",
    failed: "アップデートを確認できませんでした。",
  },

  star: {
    title: "FMLibreEditor を気に入っていただけましたか？",
    text: "GitHub でスターを付けていただくと、より多くのプレイヤーに届き、開発も速く進みます。",
    star: "GitHub でスターを付ける",
    dismiss: "閉じる",
  },

  edit: {
    unknownNation: "不明な国",
    unknownCity: "不明な都市",
    edit: "編集",
    editTitle: "このプロフィールの値をゲーム内で変更します",
    startFailed: (reason: string) => `編集を開始できませんでした：${reason}`,
    positionRating: (position: string) => `${position}適性`,
    was: (value: string) => `変更前：${value}`,
    invalid: (min: number, max: number) => `${min}〜${max}の整数を入力してください`,
    invalidDate: (from: string, to: string) => `${from}〜${to}の日付を入力してください`,
    invalidMoney: (from: string, to: string) => `${from}〜${to}の金額（整数）を入力してください`,
    invalidPercentage: (from: string, to: string) => `${from}〜${to}の割合（整数）を入力してください`,
    percent: "%",
    yes: "はい",
    no: "いいえ",
    none: "なし",

    // The footer
    footer: "編集中",
    changes: changeCount,
    invalidCount: (count: number) => `${count}件が無効`,
    review: "確認",
    reviewList: "適用する変更",
    discard: "破棄",
    apply: "適用",
    applying: "適用中…",
    applyBlocked: "先に無効な値を直してください",
    done: "完了",
    confirmDiscard: (count: number) => `${changeCount(count)}を破棄しますか？`,
    keepEditing: "編集を続ける",

    // After Apply
    applied: (count: number) => `${changeCount(count)}を適用しました`,
    nothingToChange: "変更はありません：ゲームはすでにこれらの値です。",
    refused: (label: string, reason: string) => `${label}：${reason}`,
    rereadFailed: (reason: string) => `値を読み戻せませんでした：${reason}`,
    dismiss: "閉じる",
  },

  changes: {
    nav: "変更履歴",
    title: "変更",
    hint:
      "新しい順。アプリはキャリアごとに変更を保存するため、再起動後も一覧に表示されます。ゲームが書き込んだ値をまだ保持している間だけ、変更を元に戻せます。",
    /** Under the hint, when the list holds changes from earlier sessions: how many, and how many of them the game did not hold. */
    earlierNote: (count: number, missing: number) =>
      `以前のセッションの${changeCount(count)}` + (missing > 0 ? `（うち${format(missing)}件はデータ読み込み時にゲーム内にありませんでした）` : "") + "。移籍、治療、結びつき、条項、名前の変更は履歴として残り、元に戻せません。",
    /** The small tag after the name of an earlier change, and its hover text. */
    earlierTag: "以前",
    earlierTitle: "アプリが最後に接続する前に書き込まれ、このキャリアの履歴に保存されています",
    /** Under the status of an earlier change: whether the game held its value when the data was last read. */
    inGame: "ゲーム内",
    inGameTitle: "データを最後に読み込んだとき、ゲームはこの値を保持していました",
    notInGame: "ゲーム内になし",
    notInGameTitle: "最後の読み込み時にゲームにありませんでした：変更後に保存しなかったか、ゲームが値を変えました",
    /** In the place of Undo for an earlier change that cannot be undone from here, and its hover text. */
    historyOnly: "履歴",
    historyOnlyTitle: "アプリが最後に接続する前に行われた変更：元に戻すには当時のゲームのメモリが必要でした",
    /** Under a mass edit: how many of its earlier changes the game did not hold. */
    batchNotInGame: (count: number) => `${format(count)}件はゲーム内になし`,
    /** Empties the list and the history of the career; the question that asks first, and its two answers. */
    clearHistory: "履歴を消去",
    clearHistoryTitle: "この一覧を空にし、このキャリアの履歴を消去します。変更はゲームに残ります",
    confirmClear: "このキャリアの履歴を消去しますか？変更はゲームに残りますが、ここからは元に戻せなくなります。",
    keepHistory: "残す",
    clearConfirm: "消去",
    continueHint: "変更はゲームが進行した後に表示されます：ゲームで「続ける」を押してください。",
    swappedWith: (name: string) => `${name}とトレード`,
    released: (name: string) => `${name}を契約解除`,
    fee: (amount: string) => `移籍金 ${amount}`,
    arranged: (date: string) => `ゲームは${date}に移動を行います`,
    arrangedLoan: (day: string, until: string) => `ゲームは${day}にレンタル移籍を行います（${until}まで）`,
    optionRemoved: (amount: string) => `買い取りオプション（${amount}）を削除`,
    healed: (count: number) => `負傷${format(count)}件を治療`,
    lifted: (count: number) => `出場停止${format(count)}件を解除`,
    keptPlaying: (date: string | null) => (date === null ? "現役を続行" : `${date}の引退を阻止`),
    count: (total: number, undone: number) => {
      const count = changeCount(total);
      return undone === 0 ? count : `${count} · ${undone}件を元に戻し済み`;
    },
    empty: "まだ変更はありません。選手・スタッフ・クラブを開いて「編集」を選ぶか、一覧で「一括編集」を使ってください。",
    columns: {
      time: "時刻",
      name: "名前",
      field: "項目",
      change: "変更",
      status: "状態",
    },
    kinds: { player: "選手", staff: "スタッフ", club: "クラブ", nationalTeam: "代表チーム", competition: "大会" },
    stored: (change: string) => `内部値 ${change}`,
    undone: (time: string) => `${time}に元に戻しました`,
    undo: "元に戻す",
    undoTitle: (label: string) => `${label}の元の値をゲームに書き戻します`,
    batch: "一括編集",
    batchCount: (total: number, remaining: number) =>
      remaining === 0
        ? `${changeCount(total)} · すべて元に戻し済み`
        : `${changeCount(total)} · ${format(remaining)}件が未取り消し`,
    showChanges: "変更を表示",
    hideChanges: "変更を隠す",
    undoBatch: "一括編集を元に戻す",
    undoBatchTitle: (remaining: number) =>
      `この一括編集の元の値をゲームに書き戻します（${format(remaining)}件が適用中）`,

    pages: "一覧のページ",
    batchPages: "この一括編集の変更のページ",
    previous: "前へ",
    next: "次へ",
    range: (first: number, last: number, total: number) => `${format(total)}件中 ${format(first)}–${format(last)}`,

    // Search and filters
    /** The search box: what it looks through. Its name for assistive technology is the same. */
    searchPlaceholder: "名前、UID、項目、クラブで変更を検索",
    /** The name of the three buttons that choose which sessions' changes are listed, for assistive technology. */
    sessionGroup: "セッション",
    sessions: { all: "すべて", this: "このセッション", earlier: "以前のセッション" },
    /** The check boxes: only changes still in place, and only earlier ones the game did not hold; their hover text. */
    notUndone: "元に戻していない",
    notUndoneTitle: "まだ有効な変更のみ",
    notInGameFilterTitle: "データを最後に読み込んだとき、ゲームが保持していなかった以前の変更のみ",
    /** Takes the search text and every choice away. */
    clearFilter: "フィルターを解除",
    /** The line beside the title while a search or a filter is on: `matching` of the `total` changes, `undone` of those undone. */
    filteredCount: (matching: number, total: number, undone: number) => {
      const count = `${changes(total)}のうち${format(matching)}件`;
      return undone === 0 ? count : `${count} · ${format(undone)}件を元に戻し済み`;
    },
    /** Under a mass edit while a search or a filter is on: how many of its changes they leave. */
    batchMatching: (matching: number, total: number) => `${format(total)}件中${format(matching)}件が一致`,
    /** In the place of the list when the search and the filters leave no change. */
    noMatches: "検索とフィルターに一致する変更はありません。",
  },

  export: {
    button: "書き出し",
    buttonTitle: {
      player: "一覧に表示中の選手を CSV または JSON ファイルに書き出します",
      staff: "一覧に表示中のスタッフを CSV または JSON ファイルに書き出します",
      club: "一覧に表示中のクラブを CSV または JSON ファイルに書き出します",
    },
    title: { player: "選手を書き出し", staff: "スタッフを書き出し", club: "クラブを書き出し" },
    scope: (entity: ExportEntity, count: number) =>
      count === 0
        ? `検索とフィルターに一致する${nouns[entity]}はいません。`
        : `${entityCount(entity, count)}：一覧の検索とフィルターで選ばれたもの（一覧の順）。`,
    formatLabel: "形式",
    formats: {
      csv: "CSV（カンマ区切り）",
      csvSemicolon: "CSV（セミコロン区切り）",
      json: "JSON",
    },
    formatHints: {
      csv: "ほとんどの表計算ソフトやスクリプト向け",
      csvSemicolon: "小数点にカンマを使う地域の Excel 向け（トルコ語、スペイン語、ドイツ語など）",
      json: {
        player: "スクリプト向け：ポジション・能力値・性格をそれぞれ独立したオブジェクトにします",
        staff: "スクリプト向け：能力値・性格・契約をそれぞれ独立したオブジェクトにします",
        club: "スクリプト向け：サポーター・施設・スタジアム・財務をそれぞれ独立したオブジェクトにします",
      },
    },
    contents: {
      player:
        "各選手の能力、ポジションとポジション適性、1〜20段階の能力値（隠し能力も含む）、性格、評価、代表出場数、" +
        "条項を含む契約と、ゲーム内の日付。金額はゲームと同じくポンドです。ゲーム内では何も変わりません。",
      staff:
        "各スタッフの職と所属先、能力、1〜20段階の能力値、性格、評価、契約（給与と日付）と、ゲーム内の日付。金額は" +
        "ゲームと同じくポンドです。ゲーム内では何も変わりません。",
      club:
        "各クラブの国、リーグ、評価、創立年、シーズンチケット、SNSフォロワー、サポーターの内訳と特徴、施設、スタジアム、財務（残高、" +
        "移籍予算、週あたりの給与支出と給与予算、チケット価格）と、ゲーム内の日付。FM はプレー中のリーグのクラブの財務" +
        "しか保持していません。金額はゲームと同じくポンドです。ゲーム内では何も変わりません。",
    },
    export: "書き出し",
    exporting: "書き出し中…",
    done: (entity: ExportEntity, count: number, file: string) => `${entityCount(entity, count)}を ${file} に書き出しました`,
    folder: (folder: string) => `${folder} 内`,
    skipped: (entity: ExportEntity, count: number) =>
      `${entityCount(entity, count)}は読み取り中にゲーム内で変更されたため、除外しました。`,
    open: "開く",
    openTitle: "システムで関連付けられたアプリでファイルを開きます",
    show: "フォルダで表示",
    showTitle: "ファイルをフォルダで表示します",
    close: "閉じる",

    /** The export of the Changes view: a CSV file of the changes its search and filters show. */
    changes: {
      buttonTitle: "一覧に表示されている変更をCSVファイルに書き出します",
      title: "変更を書き出し",
      /** What the export covers: everything the list's search and filters select, or, with none on, the whole history. */
      scope: (count: number, filtering: boolean) =>
        count === 0
          ? "検索とフィルターに一致する変更はありません。"
          : filtering
            ? `${changes(count)}：検索とフィルターで選ばれたもの（新しい順）。`
            : `${changes(count)}：このキャリアの履歴すべて（新しい順）。`,
      contents:
        "各変更の時刻（ローカル時刻、UTCとの差つき）、名前とUID、項目、変更前と変更後の値（ゲームが保存している形と、" +
        "ここでの表示）、一覧がその下に示す補足、含まれていた一括編集、元に戻した時刻、以前のセッションのものか、" +
        "ゲーム内にあるか。ゲームは何も変更されません。",
      done: (count: number, file: string) => `${changes(count)}を ${file} に書き出しました`,
    },
  },

  massEdit: {
    button: "一括編集",
    buttonTitle: "一覧に表示中のすべての値を変更します（先にプレビューを表示）",
    title: {
      player: "選手を一括編集",
      staff: "スタッフを一括編集",
      club: "クラブを一括編集",
    },

    // What it applies to
    scope: (entity: Entity, total: number) => `一覧に現在表示されている${entityCount(entity, total)}（検索とフィルター）`,
    scopeAll: (shown: number) => `画面上の先頭${format(shown)}行だけでなく、一致するものすべてが対象です。`,
    scopeNone: (entity: Entity) => `検索とフィルターに一致する${nouns[entity]}がないため、変更するものはありません。`,
    scopeTooMany: (entity: Entity, total: number, limit: number) =>
      `一覧に表示されている${entityCount(entity, total)}は、1回の一括編集の上限（${format(limit)}）を超えています。` +
      "先に検索やフィルターで絞り込んでください。",
    loadingFields: "項目を読み込み中…",
    fieldsFailed: (reason: string) => `項目を読み込めませんでした：${reason}`,

    // The fields to change
    groups: {
      ability: "能力",
      technical: "テクニカル能力値",
      mental: "メンタル能力値",
      physical: "フィジカル能力値",
      goalkeeping: "GK能力値",
      hidden: "隠し能力値",
      feet: "利き足",
      coaching: "コーチング能力値",
      knowledge: "知識能力値",
      medical: "メディカル能力値",
      positions: "ポジション",
      personality: "性格",
      reputation: "評価",
      international: "代表",
      contract: "契約",
      facilities: "施設",
      finances: "財務",
      stadium: "スタジアム",
      traits: "特性",
      health: "メディカル",
      other: "その他",
    },
    fieldsLabel: "変更する項目",
    row: (position: number) => `変更 ${position}`,
    field: "項目",
    operation: "操作",
    operations: { set: "指定値にする", add: "加算", scale: "%に倍率変更", addYears: "年数を加算" },
    values: { set: "値", add: "量", scale: "パーセント", addYears: "年数" },
    addTitle: "表示されている各値に加算します。負の数なら減算します",
    addPointsTitle: "各値にパーセントポイントを加算します（70%に10を足すと80%）。負の数なら減算します",
    rangeHint: (min: number, max: number) => `${format(min)}–${format(max)}`,
    amountHint: (max: number) => `±${format(max)}`,
    ofCurrent: "%（現在値に対して）",
    percentTitle: "現在値に対するパーセント：100でそのまま、110で1割増し、50で半分",
    addYearsTitle: "各日付に加算する年数です。負の数なら過去に戻し、2月29日は2月28日になることがあります",
    years: "年",
    invalidAdd: (min: number, max: number) => `${format(min)}〜${format(max)}の整数を入力してください`,
    invalidPercent: (min: number, max: number) => `${min}〜${max}の整数のパーセントを入力してください`,
    invalidYears: (min: number, max: number) => `${format(min)}〜${format(max)}の整数の年数を入力してください`,
    dateSetOnly: "日付は指定値にするか、年数を加算することしかできません",
    yearsDateOnly: "年数を加算できるのは日付だけです",
    addField: "項目を追加",
    addFieldFull: (max: number) => `1回の一括編集で変更できる項目は${max}個までです`,
    remove: "この項目を削除",
    removeLast: "一括編集には項目が1つ以上必要です",

    // The preview
    preview: "プレビュー",
    previewing: "プレビュー中…",
    previewBlocked: "プレビューするには、すべての項目に有効な値を入力してください",
    summary: (entity: Entity, preview) =>
      [
        preview.changes === 0
          ? "変更なし"
          : `${entityCount(entity, preview.targets)}中${format(preview.targets - preview.unchanged)}件に` +
            changeCount(preview.changes),
        preview.unchanged > 0 && `${format(preview.unchanged)}件はすでにこの値`,
        preview.skippedCount > 0 && valuesLeftAlone(preview.skippedCount),
      ]
        .filter(Boolean)
        .join(" · "),
    tableLabel: "一括編集で行われる変更",
    columns: { name: "名前", field: "項目", change: "変更", reason: "理由" },
    more: (count: number) => `ほか${format(count)}件`,
    skippedHeading: valuesLeftAlone,
    skippedLabel: "一括編集で変更しない値",

    // Apply and undo
    apply: "適用",
    applying: "適用中…",
    applyTitle: (changes: number) => `${changeCount(changes)}をゲームに書き込みます`,
    applyFirst: "先に一括編集をプレビューしてください",
    applyNothing: "プレビューに書き込む変更がありません",
    hint: "適用するまで、ゲーム内では何も変わりません。",
    applied: (count: number) => (count === 0 ? "変更は書き込まれませんでした" : `${changeCount(count)}を適用しました`),
    failure: (name: string, label: string, reason: string) => `${name} · ${label}：${reason}`,
    undo: "この一括編集を元に戻す",
    undoing: "元に戻し中…",
    undoTitle: "この一括編集の元の値をゲームに書き戻します",
    undone: (count: number) => (count === 0 ? "元に戻したものはありません" : `${changeCount(count)}を元に戻しました`),
    undoFailure: (who: string, reason: string) => `${who}：${reason}`,
    changeNumber: (id: number) => `変更 ${id}`,
    close: "閉じる",
  },

  comparison: {
    compare: "比較",
    add: "比較に追加",
    remove: "比較から外す",
    full: (max: number) => `比較できるのは${max}人までです。この選手を追加するには1人外してください。`,

    // The tray under the player list
    trayLabel: "比較する選手",
    removePlayer: (name: string) => `比較から外す：${name}`,
    clear: "クリア",
    open: (count: number) => `比較（${count}）`,

    // The dialog
    title: "比較",
    hint: "各行で最も良い値を強調表示します：最も高い値、低いほど良い項目では最も低い値。",
    tooFew: "比較するには2人以上追加してください。",
    loading: "選手を読み込み中…",
    tableLabel: "比較する選手の値",
    highest: "最高",
    lowest: "最低",
    profile: "プロフィール",
    close: "閉じる",
  },

  move: {
    button: "移籍",
    buttonTitle: "ゲーム内でこの選手を別のクラブに移籍させます（移籍金の設定も可能）",

    // The dialog
    title: "移籍",
    from: "移籍元",
    to: "移籍先",

    modeLabel: "移籍、レンタル、今すぐ移動、またはトレード",
    modeMove: "今すぐ移動",
    modeSwap: "選手とトレード",
    modeArrange: "移籍",
    arrangeNote:
      "ゲームが次の日に、自身の移籍と同じように移籍を行います。選手の履歴には今季の試合が元のクラブのものとして残り、" +
      "新しいクラブが移籍金とともに記録され、移籍金はゲームが支払います。",
    moveNote:
      "エディターがその場で選手を移動します。ゲームの履歴には記録されません。今季は新しいクラブの所属として表示され、" +
      "移籍金もありません。",
    arrangeUnavailable:
      "このバージョンのゲーム、またはこのシステムでは、エディターがゲームに実行させる移籍を手配できません。" +
      "「今すぐ移動」ならその場で移動します。",
    arrangeChecking: "移籍を確認しています…初回はゲームの移籍処理を見つけるのに数秒かかります。",
    movesOn: (date: string) => `ゲームは${date}に移動を行います`,
    arrangeFee: (amount: string) => `移籍金 ${amount}、当日にゲームが支払います`,
    arrangeContract: (wage: string, expires: string) => `契約：週${wage}、${expires}まで`,
    arrangeDoes: [
      "今すぐ手配されます。ゲーム内で次の日になると、ゲームが移動を行います",
      "履歴には今季の試合が元のクラブのものとして残り、新しいクラブが移籍金とともに記録されます",
      "移籍金は、ゲーム自身の移籍と同じく、当日にゲームが支払います",
      "その日から新しいクラブとの契約になります。週給と契約期間は、新しい値を入力しない限り変わりません",
      "変更履歴に記録され、当日まではワンクリックの元に戻す操作で取り消せます",
    ],
    arrangeButton: "移籍を手配",

    modeLoan: "レンタル",
    loanNote: "ゲームは次の日に、自前の移籍と同様にレンタルを実行し、終了後は元のクラブに戻ります。",
    loanChecking: "レンタルを確認しています…",
    loanOn: (date: string) => `ゲームは${date}にレンタルを行います`,
    loanUntil: (date: string) => `レンタルは${date}までです`,
    loanWage: (money: string, share: number) => `クラブは週${money}を支払います（給与の${format(share)}%）`,
    loanMonthlyFee: (money: string) => `月額レンタル料 ${money}`,
    loanOption: (money: string) => `買い取りオプション ${money}`,
    loanDoes: [
      "今すぐ合意：ゲームは次の日になるとレンタルを行います",
      "履歴にレンタルが載り、最終日の翌日に元のクラブへ戻ります",
      "クラブは給与の負担分を支払い、設定した場合は月額レンタル料も支払います",
      "オプションがあれば、レンタル終了時に移籍先クラブがその金額で買い取ることができます",
    ],
    loanDoesHeading: "レンタル移籍で行われること",
    loanHint: "「レンタルを手配」を押すまで、ゲーム内では何も変わりません。",
    loanButton: "レンタルを手配",
    loanLastDay: "レンタル最終日",
    loanLastDayHint: "翌日に元のクラブへ戻ります",
    loanShare: "給与の負担割合",
    loanShareHint: "加入先クラブが支払う割合。残りは元のクラブが負担します",
    loanShareInvalid: "0〜100の整数を入力してください",
    loanMonthly: "月額レンタル料",
    loanOptionFee: "買い取りオプション",
    loanOptionFeeHint: "レンタル終了時、移籍先クラブがこの金額で買い取ることができます。空欄ならなし",

    // Choosing the club
    searchLabel: "移籍先のクラブを検索",
    resultsLabel: "見つかったクラブ",
    searching: "クラブを検索中…",
    searchFailed: (reason: string) => `クラブを検索できませんでした：${reason}`,
    more: (count: number) => `ほか${format(count)}件。入力して絞り込んでください`,
    change: "別のクラブを選ぶ",

    // The fee
    feeHeading: "移籍金",
    fee: "移籍金",
    feeHint: "空欄なら移籍金なし（フリー移籍）",
    feeInvalid: (max: string) => `0〜${max}の金額（整数）を入力してください`,
    pays: (club: string, fee: string, balance: string, budget: string | null) =>
      `${club}が${fee}を支払います：残高 ${balance}${budget === null ? "" : `、移籍予算 ${budget}`}`,
    receives: (club: string, fee: string, balance: string) => `${club}が${fee}を受け取ります：残高 ${balance}`,
    noFinances: (club: string) => `${club}にはゲーム内の財務がありません：資金はそのままです`,

    // The contract
    wageInvalid: "0以上の金額（整数）を入力してください",
    expiresInvalid: "日付を入力してください",

    // What the dialog says about the move itself
    chooseClub: "選手の移籍先クラブを選んでください。",
    fixTerms: "先に移籍金または契約の値を直してください。",
    checking: "移籍を確認中…",
    route: (from: string, to: string) => `${from} → ${to}`,
    doesHeading: "移籍で行われること",
    does: [
      "新しいクラブのトップチームに加入します",
      "契約はゲーム内の日付から始まり、背番号は空になります",
      "移籍リストとローンリストから外れます",
      "週給と契約満了日は、新しい値を設定した場合だけ変わります",
      "移籍金は獲得するクラブの残高と移籍予算から引かれ、放出するクラブの残高に入ります",
      "元のクラブでのキャプテンの役割は空席になります",
      "ゲームの移籍履歴にはまだ表示されません",
      "変更履歴に記録され、1回の取り消しで移籍と移籍金を元に戻せます",
    ],

    noRoom: (club: string) => `${club}のスカッドに空きがありません。`,
    noRoomInfoLabel: "なぜですか？",
    noRoomInfo:
      "エディターは可能な場合は満員のメンバー表を広げますが、このメンバー表は広げられません：空きを作るには誰かが" +
      "出ていく必要があります。",
    noRoomNeed: (player: string, club: string) => `${player}が加入するには、${club}から誰か1人が出ていく必要があります。`,
    releaseChoice: "契約解除：",
    releasePickLabel: "契約解除する選手",
    releaseOutcome: "→ フリーエージェントになります",
    injuredTag: "負傷中",
    captainTag: "キャプテン",
    swapChoice: "トレードにする：",
    swapChoiceOutcome: (club: string) => `この選手は${club}へ移ります`,
    moveAndRelease: (name: string) => `移籍させて${name}を契約解除`,
    makeRoomDoes: [
      "契約解除される選手の代わりに、新しいクラブのトップチームに加入します",
      "契約解除される選手はそのクラブのすべてのチームを離れ、契約が終了してフリーエージェントになります",
      "契約はゲーム内の日付から始まり、背番号は空になります",
      "移籍リストとローンリストから外れます",
      "週給と契約満了日は、新しい値を設定した場合だけ変わります",
      "移籍金は獲得するクラブの残高と移籍予算から引かれ、放出するクラブの残高に入ります",
      "どちらかが離れるクラブで務めていたキャプテンの役割は空席になります",
      "ゲームの移籍履歴にはまだ表示されません",
      "変更履歴に1件として記録され、1回の取り消しで移籍・契約解除・移籍金を元に戻せます",
    ],

    swapTitle: "選手とトレード",
    swapWith: "トレード相手",
    playerSearchLabel: "トレード相手の選手を検索",
    playerSearch: "このクラブの選手を名前で検索",
    playersLabel: "見つかった選手",
    playersSearching: "選手を検索中…",
    playersSearchFailed: (reason: string) => `選手を検索できませんでした：${reason}`,
    playersEmpty: (query: string) =>
      query === "" ? "このクラブには選手がいません。" : `このクラブには「${query}」に一致する選手はいません。`,
    changePlayer: "別の選手を選ぶ",

    // What the dialog says about the swap
    swapContract: "各選手はそれぞれの契約を維持します。週給と契約満了日は変わりません。",
    staffButtonTitle: "ゲーム内でこのスタッフを別のクラブに異動させます",
    staffChooseClub: "このスタッフの異動先クラブを選んでください。",
    staffContract: "職・週給・契約満了日はそのままで、契約はゲーム内の日付から始まります。",
    staffJob: "職",
    staffJobChoose: "職を選択…",
    staffJobKept: (job: string) => `${job}（そのまま）`,
    staffNewJob: "新しい職に就き、週給と契約満了日はそのままで、契約はゲーム内の日付から始まります。",
    staffDoes: [
      "新しいクラブの、その職がある部門（メディカル・コーチ・スカウト）に加わるか、フットボールディレクターまたは監督に" +
        "就任します（すでにいるクラブには就任できません）",
      "週給と契約満了日は同じで、契約はゲーム内の日付から始まります",
      "チームを離れる監督の座は空席となり、クラブが補充します。役員会はゲームに任せます",
      "変更履歴に記録され、元に戻せます",
    ],
    staffSignButtonTitle: "クラブに所属していないこのスタッフを、ゲーム内のクラブと契約させます",
    staffSignTitle: "スタッフと契約",
    staffSignChooseClub: "契約するクラブを選んでください。",
    staffSignChooseJob: "クラブで担当する職を選んでください。",
    staffSignTerms:
      "空欄なら、職が最も近いそのクラブのスタッフと同じ週給で、来シーズン終了までの契約になります。",
    staffSignRoute: (to: string) => `所属なし → ${to}`,
    staffSignContract: (wage: string, expires: string) => `新しい契約：週${wage}、${expires}まで`,
    staffSignDoes: [
      "クラブの、その職がある部門（満員なら広げます）に加わるか、いなければフットボールディレクターまたは監督に就任します",
      "ゲームが契約を作るのと同じく、ゲームの空き契約枠の1つにゲーム内の日付からの新しい契約を作ります",
      "同じ職のスタッフ（いなければ同じ部門、それもいなければ誰か）のうち、能力が最も近い人の契約を手本にします",
      "指定した週給と契約満了日、または手本の契約の週給と来シーズン終了まで。条項やボーナスはなし",
      "変更履歴に記録され、1回の取り消しですべて元に戻せます",
    ],
    swapChooseClub: "トレード相手の選手のクラブを選んでください。",
    swapChoosePlayer: "トレード相手の選手を選んでください。",
    swapChecking: "トレードを確認中…",
    swapRoute: (player: string, from: string, to: string, other: string) =>
      `${player}：${from} → ${to}\n${other}：${to} → ${from}`,
    swapDoesHeading: "トレードで行われること",
    swapDoes: [
      "それぞれが相手のクラブのトップチームに加入します",
      "契約はゲーム内の日付から始まり、背番号は空になります",
      "両者とも移籍リストとローンリストから外れます",
      "元のクラブでのキャプテンの役割は空席になります",
      "移籍金の支払いはなく、経歴も更新されません",
      "変更履歴に1件として記録され、両方の移籍を元に戻せます",
    ],

    signButtonTitle: "このフリーエージェントをゲーム内のクラブと契約させます",
    signTitle: "フリーエージェントと契約",
    signChooseClub: "選手と契約するクラブを選んでください。",
    signChecking: "契約を確認中…",
    signTerms: "空欄なら、能力が最も近いそのクラブの選手と同じ週給で、来シーズン終了までの契約になります。",
    signRoute: (to: string) => `フリーエージェント → ${to}`,
    signContract: (wage: string, expires: string, status: string) =>
      `新しい契約：週${wage}、${expires}まで、${status}`,
    signDoesHeading: "契約で行われること",
    signDoes: [
      "クラブのトップチームに加入します。メンバー表が満員なら広げます",
      "ゲームが契約を作るのと同じく、ゲームの空き契約枠の1つにゲーム内の日付からの新しい契約を作ります",
      "能力が最も近いそのクラブの選手の契約を手本にします：同じ契約の種類とチーム内の立場",
      "指定した週給と契約満了日、またはその選手の週給と来シーズン終了まで",
      "背番号・ロイヤルティボーナス・条項・ボーナスはなし",
      "ゲームの移籍履歴にはまだ表示されません",
      "変更履歴に記録され、1回の取り消しですべて元に戻せます",
    ],
    signHint: "「契約」を押すまで、ゲーム内では何も変わりません。",
    sign: "契約",
    signing: "契約中…",

    // The foot
    hint: "「移籍」を押すまで、ゲーム内では何も変わりません。",
    arrangeHint: "「移籍を手配」を押すまで、ゲーム内では何も変わりません。",
    moveNowHint: "「今すぐ移動」を押すまで、ゲーム内では何も変わりません。",
    move: "移籍",
    moving: "移籍中…",
    cancel: "キャンセル",
    swapHint: "「トレード」を押すまで、ゲーム内では何も変わりません。",
    swap: "トレード",
    swapping: "トレード中…",
  },

  ties: {
    heading: "国籍とホームグロウン",
    nationalities: "第2国籍",
    trainedInNation: "育成された国",
    trainedAtClub: "育成されたクラブ",
    workPermit: "労働許可が不要な国",
    none: "なし",
    rules: {
      1: "ホームグロウン 15-21",
      2: "ホームグロウン 0-21",
      5: "ホームグロウン 15-21（ローンを除く）",
      10: "ホームグロウン 0-19（1年）",
    } as Readonly<Record<number, string>>,
    rule: (code: number) => `ホームグロウン規定 ${format(code)}`,

    change: "変更",
    changeTitle: "ゲーム内でこの選手の第2国籍とホームグロウンの状態を変更します",
    title: "国籍とホームグロウン",
    hint: "各変更はすぐにゲームに書き込まれ、変更履歴に記録されて元に戻せます。",
    full:
      "ゲームはこの選手のリストを現在の内容がちょうど収まる大きさにしています：国籍や育成歴の変更・削除はできますが、" +
      "追加はできません。",
    nationOf: (name: string) => `${name}の代わりの国`,
    ruleOf: (name: string) => `${name}のホームグロウン規定`,
    remove: "削除",
    removeTitle: (name: string) => `${name}を削除`,
    addNationality: "国籍を追加…",
    addNation: "国を追加…",
    addPermit: "労働許可が不要な国を追加…",
    daysLeft: (days: number) => `残り${format(days)}日`,
    permitInfoLabel: "これは何をしますか？",
    permitInfo:
      "ゲームでは、ブレグジット前にイングランドやスコットランドにいたEU出身の選手は、一定日数の間、労働許可なしでそこで" +
      "プレーできます。これを与えられた選手も、その国で同じ残り日数の間、労働許可なしでプレーできます（セーブ内に該当者が" +
      "いない場合は10年）。",
    newRule: "新しい国のホームグロウン規定",
    add: "追加",
    changeClub: "クラブを変更",
    changeClubTitle: (name: string) => `${name}の代わりに別のクラブで育成されたことにします`,
    clubInsteadOf: (name: string) => `${name}の代わりのクラブ`,
    addClub: "クラブを追加…",
    addClubTitle: "育成されたクラブをもう1つ追加します",
    newClub: "新しいクラブ",
    pickAnother: "別のものを選ぶ",
    newClubRule: "新しいクラブのホームグロウン規定",
    cancel: "キャンセル",
    working: "ゲームに書き込み中…",
    close: "閉じる",
  },

  clauses: {
    change: "変更",
    changeTitle: "ゲーム内でこの選手のボーナスと条項を変更します",
    title: "ボーナスと条項",
    hint: "各変更はすぐにゲームに書き込まれ、変更履歴に記録されて元に戻せます。",
    full:
      "ゲームはこの契約のリストを現在の内容がちょうど収まる大きさにしています：ボーナスや条項の変更・削除はできますが、" +
      "契約解除条項は追加できません。",
    amountOf: (name: string) => `${name}の金額`,
    conditionOf: (name: string) => `${name}の条件`,
    save: "保存",
    remove: "削除",
    removeTitle: (name: string) => `${name}を削除`,
    addRelease: "契約解除条項を追加",
    releaseAmount: "新しい契約解除条項の金額",
    add: "追加",
    outOfRange: (max: string) => `0〜${max}の整数を入力してください。`,
    working: "ゲームに書き込み中…",
    close: "閉じる",
  },

  release: {
    button: "契約解除",
    buttonTitle: "ゲーム内でこの選手をクラブとの契約から解除し、フリーエージェントにします",
    staffButtonTitle: "ゲーム内でこのスタッフをクラブとの契約から解除し、所属クラブなしにします",

    // The dialog
    title: "契約解除",
    from: "離れるクラブ",
    checking: "契約解除を確認中…",
    ready: (club: string) => `${club} → フリーエージェント`,
    staffReady: (club: string) => `${club} → 無職`,
    doesHeading: "契約解除で行われること",
    does: [
      "クラブのすべてのチームを離れ、契約が終了します：どのクラブとも契約できるフリーエージェントになります",
      "誰にも何も支払われません",
      "クラブでのキャプテンの役割は空席になります",
      "ゲームの移籍履歴には表示されません",
      "変更履歴に記録され、1回の取り消しで同じ契約のまま選手を戻せます",
    ],
    staffDoes: [
      "すぐにクラブのスタッフから外れ、契約が終了します：ゲーム自身の所属クラブのないスタッフと同じく無職になります",
      "誰にも何も支払われません",
      "監督やフットボールディレクターの座は空席となり、クラブが補充します",
      "変更履歴に記録され、1回の取り消しで同じ契約のまま戻せます",
    ],

    // The foot
    hint: "「契約解除」を押すまで、ゲーム内では何も変わりません。",
    release: "契約解除",
    releasing: "契約解除中…",
    cancel: "キャンセル",
  },

  rename: {
    button: "名前を変更",
    buttonTitle: "ゲーム内でこの選手の名前を変更します",

    // The dialog
    title: "名前を変更",
    loading: "名前を読み込み中…",
    first: "名",
    last: "姓",
    common: "通称",
    commonHint:
      "名と姓の代わりにゲームが表示する名前です（Pedri や Vinícius Júnior など）。空にすると設定なしになります",
    full: "フルネーム",
    fullHint: "プロフィールに表示される完全な名前です。空にすると設定なしになります",
    none: "なし",
    required: "空にできません",
    tooLong: (max: number) => `長すぎます：最大${max}バイトまで`,
    noRoom:
      "現在ゲームにはこの種類の新しい名前を追加する空きがありません：ゲームをセーブし、セーブデータを読み込み直してから、もう一度お試しください",
    unavailable: "このバージョンのゲームでは、エディターは名前を変更できません",
    doesHeading: "行われること",
    does: [
      "ゲームで「続ける」を押すと新しい名前が表示されます",
      "ゲームをセーブしても名前は残ります",
      "新しい名・姓・通称はゲームの名前テーブルに追加され、ゲームはこの選手にのみ使います",
      "「変更履歴」に名前ごとに1行で記録され、「元に戻す」で元の名前に戻ります",
    ],

    // The foot
    hint: "「名前を変更」を押すまで、ゲーム内では何も変わりません。",
    rename: "名前を変更",
    renaming: "名前を変更中…",
    cancel: "キャンセル",
  },

  permanent: {
    title: "ローンを完全移籍にする",
    stays: "残るクラブ",
    leaves: "離れるクラブ",
    checking: "確認中…",
    doesHeading: "行われること",
    does: [
      "現在プレーしているクラブに残り、今日から上記の条件でそのクラブと契約します",
      "そのクラブでの背番号とチーム内の立場はそのままです",
      "元のクラブのすべてのチームを離れ、ローンは終了します",
      "ゲームの移籍履歴には表示されません",
      "変更履歴に移籍として記録され、1回の取り消しでローンに戻せます",
    ],
    optionFee: (money: string) => `ローンの買い取りオプションから入力：${money}`,
    hint: "「完全移籍にする」を押すまで、ゲーム内では何も変わりません。",
    confirm: "完全移籍にする",
    confirming: "完全移籍にしています…",
    cancel: "キャンセル",
  },

  recall: {
    title: "ローンから呼び戻す",
    from: "ローン先",
    to: "戻り先",
    doesHeading: "呼び戻しで行われること",
    does: (parent: string) => [
      "今日がローンの最終日になります：その日が終わると、ゲーム自身がローンを終了します",
      `ゲームを1日進めると、${parent}に戻ります`,
      "それまでは変更履歴に記録され、取り消すとローンの元の終了日に戻ります",
    ],
    termsHeading: "ゲーム内では",
    notRecallable: (parent: string) => `このローンでは${parent}は呼び戻せません`,
    notTerminable: "このローンは途中解約できません",
    worksAnyway: "それでもここでの呼び戻しは使えます：ゲームの呼び戻し機能を通さず、ローンの最終日を変更するためです",
    dropsOption: (club: string, amount: string) =>
      `${club}の${amount}での買い取りオプションは削除されます：残すと、ローン終了時にゲームが${club}へ選手を売却することがあります`,
    hint: "「呼び戻す」を押すまで、ゲーム内では何も変わりません。",
    confirm: "呼び戻す",
    confirming: "呼び戻し中…",
    cancel: "キャンセル",
  },

  batchTraits: {
    title: "チーム特徴の一括設定",
    addMode: "+ チームに追加",
    removeMode: "- チームから削除",
    addHint: "選択したプレイスタイルをまだ持っていない選手に追加します。既存のプレイスタイルは保持されます。",
    removeHint: "選択したプレイスタイルを持っている選手から削除します。他のプレイスタイルには影響しません。",
    noneSelected: "このモードで選択された特徴はありません",
    selectedCount: (count: number) => `${format(count)}件選択中`,
    deselectAll: "すべて解除",
    oppositeModeNote: "別のモードで選択済み",
    applyNote: (players: number) => `選手${format(players)}人に適用 · 1クリックで元に戻せます`,
    emptySquad: (players: number) => `選手${format(players)}人のスカッド`,
    cancel: "キャンセル",
    apply: "適用",
    applying: "適用中…",
  },

  squad: {
    teamsLabel: "チーム",
    teams: {
      first: "トップチーム",
      b: "Bチーム",
      age: (limit: number) => `U${limit}`,
      other: (place: number) => `チーム ${place}`,
    },
    noTeams: "このクラブにはチームがありません。",
    loading: "スカッドを読み込み中…",
    empty: "このチームには選手がいません。",

    // Above the table
    players: (count: number) => `選手${format(count)}人`,
    averageAge: (age: string) => `平均年齢 ${age}`,
    captains: (captain: string, viceCaptain: string) => `キャプテン：${captain} · 副キャプテン：${viceCaptain}`,

    // The actions on the whole team
    actionsLabel: "チーム全体への操作",
    healAll: (injured: number) => (injured === 0 ? "全員を治療" : `全員を治療（負傷者${format(injured)}人）`),
    healAllTitle: "このチームの全選手の負傷をすべて治します",
    healNone: "このチームに負傷者はいません",
    liftAll: (banned: number) => (banned === 0 ? "出場停止を解除" : `出場停止を解除（${format(banned)}人）`),
    liftAllTitle: "このチームの全選手の出場停止をすべて解除します",
    liftNone: "このチームに出場停止の選手はいません",
    inspireAll: "全員を鼓舞",
    inspireAllTitle: "全選手の士気を最高の20にし、不満の理由を消します",
    maxCohesion: "連携を最大化",
    maxCohesionTitle: "全選手のクラブとの連携を最高の100にします。ゲームが進行すると表示されます",
    cohesionNone: "読み取れません：このバージョンのゲームで未確認か、どの選手にもクラブとの連携の記録がありません",
    cohesionWithout: (count: number) => `${format(count)}人はまだクラブとの連携の記録がありません`,
    maxTactics: "戦術を最大化",
    maxTacticsTitle: "全選手がチームの戦術を最高まで理解するようにします。トレーニングと同じく約6週間で下がります",
    tacticsNone: "読み取れません：このバージョンのゲームで未確認か、チームがあなたの選んだ戦術を使っていません",
    tacticsUntrained: (count: number) =>
      `${format(count)}人はトレーニングしていない（負傷など）ため、トレーニング履歴はそのままです`,
    refreshAll: "全員を回復",
    refreshAllTitle: "全選手のコンディションと試合勘を100%にし、完全に休養させます（疲労蓄積 -500）",
    batchTraits: "チーム特徴の一括設定",
    batchTraitsTitle: "このチームの選手にプレイスタイルを追加または削除します",
    maxAll: "能力値を最大化",
    maxAllTitle: "全選手の能力値をすべて最高にします：20（負傷しやすさとラフプレーは1）",
    atItsBest: "チームを万全の状態に",
    atItsBestTitle: "全員の治療・鼓舞・回復と、連携・戦術の最大化を一度に行います。「元に戻す」1回で取り消せます",
    atItsBestSkipped: (step, reason) => `「${step}」をスキップしました：${reason}`,
    destroy: "チームを最悪の状態に",
    destroyTitle: "全選手の士気、コンディション、連携、戦術の理解度を最悪にします。先に確認します",
    destroySteps: {
      demoralize: "士気と満足度",
      exhaust: "コンディションと試合勘",
      minCohesion: "連携",
      minTactics: "戦術",
    },
    moreActions: "その他の操作",
    moreActionsTitle: "チーム全体への操作を1つずつ",
    destroyDialog: {
      title: "チームを最悪の状態にしますか？",
      doesHeading: "一覧のすべての選手（ローン移籍中の選手も含む）が対象です",
      does: [
        "士気を最低の1に、満足度と出場時間への満足度を-100に",
        "コンディションを0%、試合勘を35%、疲労蓄積を1000に",
        "クラブとの連携を1に（連携の記録がある選手）",
        "戦術の理解度を最低に（チームの戦術をあなたが選んでいる場合）",
      ],
      keeps: "どの値も今より良くなることはありません。能力値、負傷、出場停止はそのままです。",
      ownClub: "これはあなた自身のクラブのチームです。",
      hint: "ゲームが進行する前なら、「元に戻す」1回ですべて取り消せます。",
      cancel: "キャンセル",
    },
    hint: "操作は一覧のすべての選手（ローン移籍中の選手も含む）が対象です。元に戻す操作は変更履歴でも行えます。",

    // Freezing the whole team, under the actions
    freezeLabel: "チーム全体を固定",
    freezeAttributes: "能力値を固定",
    freezeAttributesTitle: "アプリを開いて接続している間、このチームの全選手の能力値は下がりません",
    freezeFitness: "コンディションと試合勘を固定",
    freezeFitnessTitle: "アプリの接続中、全選手のコンディションと試合勘は下がりません。100%で保つには先に「全員を回復」を押してください",
    freezePositions: "ポジションを固定",
    freezePositionsTitle: "アプリを開いて接続している間、このチームの全選手のポジション適性はそのまま保たれます",
    frozenCount: (frozen: number, total: number) => `${format(total)}人中${format(frozen)}人`,
    freezeHint:
      "固定は一覧のすべての選手が対象で、選手がどこへ移っても続きます。アプリはこのセーブについてこの設定を覚えています。",
    frozeAttributes: (count: number) =>
      count === 0 ? "能力値はすでに固定されていました" : `${playerCount(count)}の能力値を固定しました`,
    unfrozeAttributes: (count: number) => `${playerCount(count)}の能力値の固定を解除しました`,
    frozeFitness: (count: number) =>
      count === 0
        ? "コンディションと試合勘はすでに固定されていました"
        : `${playerCount(count)}のコンディションと試合勘を固定しました`,
    unfrozeFitness: (count: number) => `${playerCount(count)}のコンディションと試合勘の固定を解除しました`,
    frozePositions: (count: number) =>
      count === 0 ? "ポジションはすでに固定されていました" : `${playerCount(count)}のポジションを固定しました`,
    unfrozePositions: (count: number) => `${playerCount(count)}のポジションの固定を解除しました`,

    // What an action did, under the buttons
    written: (count: number) => `${changeCount(count)}を書き込みました`,
    refused: (name: string, reason: string) => `${name}：${reason}`,
    undo: "元に戻す",
    undoTitle: "これらの変更の元の値をゲームに書き戻します",

    // Captains
    captainShort: "C",
    viceCaptainShort: "VC",
    menuLabel: (name: string) => `${name}のキャプテン設定`,
    menuTitle: "キャプテン",
    makeCaptain: "キャプテンにする",
    makeViceCaptain: "副キャプテンにする",
    nowCaptain: (name: string) => `${name}がキャプテンになりました`,
    nowViceCaptain: (name: string) => `${name}が副キャプテンになりました`,
    noCaptain: "現在キャプテンはいません",
    noViceCaptain: "現在副キャプテンはいません",

    // The table
    tableLabel: (team: string) => `${team}の選手`,
    openProfile: "選手のプロフィールを開く",
    columns: {
      name: "名前",
      position: "ポジ",
      age: "年齢",
      currentAbility: "CA",
      potentialAbility: "PA",
      condition: "コンディション",
      matchSharpness: "試合勘",
      jadedness: "疲労",
      morale: "士気",
      cohesion: "連携",
      tactics: "戦術",
      actions: "キャプテン",
    },
    sortBy: (by: string) => `${by}で並べ替え`,
    sortNames: {
      name: "名前",
      position: "ポジション",
      age: "年齢",
      currentAbility: "現在能力",
      potentialAbility: "潜在能力",
      condition: "コンディション",
      matchSharpness: "試合勘",
      jadedness: "疲労蓄積",
      morale: "士気",
      cohesion: "連携",
      tactics: "戦術理解度",
    },

    // The tags after a name, with what each means as hover text
    injured: "負傷",
    injuredTitle: (count: number) => `負傷${format(count)}件`,
    banned: "出場停止",
    bannedTitle: (count: number) => `出場停止${format(count)}件`,
    unrest: "不和",
    unrestTitle: (count: number) =>
      `チームメイト${format(count)}人がこの選手に不満を抱いています。プロフィールの「すべて解消」で、ゲームの進行後に解消されます`,
    onLoan: "ローン中",
    onLoanTitle: "他のクラブへローン移籍中",
    loanee: "ローン加入",
    loaneeTitle: "他のクラブからローンで加入中",
    elsewhere: "他チーム",
    elsewhereTitle: "クラブの別のチームでプレー中",
    frozen: "固定中",
    frozenTitle: (attributes: boolean, fitness: boolean, positions: boolean): string => {
      const frozen = [
        ...(attributes ? ["能力値"] : []),
        ...(fitness ? ["コンディション", "試合勘"] : []),
        ...(positions ? ["ポジション"] : []),
      ];
      return `${frozen.join("・")}が固定されています`;
    },
  },

  game: {
    name: "Football Manager",
    storefronts: {
      gamePass: "Game Pass",
      steam: "Steam",
      epic: "Epic Games",
      unknown: "不明なストア",
    },
    steamBuild: (id: string) => `ビルド ${id}`,
  },

  scouting: {
    nav: "スカウト",
    reading: "あなたのクラブを読み込み中…",
    refresh: "更新",
    refreshTitle: "ゲームからクラブを再度読み込みます",
    searching: "検索中…",
    none: "—",
    perWeek: "/週",
    openProfile: "プロフィールを開く",
    freeAgent: "フリーエージェント",
    loan: "ローン",
    header: {
      transferBudget: "移籍予算",
      wageRoom: "給与の余裕",
      wageBudget: "給与予算",
      squad: "スカッド",
      averageAge: "平均年齢",
      players: (count: number) => `選手${format(count)}人`,
    },
    tabs: {
      label: "スカウトの項目",
      recommend: "補強アドバイス",
      opportunities: "狙い目",
      similar: "似た選手",
      depth: "選手層",
      departures: "放出候補",
      youth: "ユース入団",
    },
    status: {
      missing: "不在",
      thin: "手薄",
      fine: "適正",
      crowded: "過剰",
    },
    lines: {
      goalkeeper: "ゴールキーパー",
      centreBack: "センターバック",
      fullBack: "フルバック",
      wingBack: "ウイングバック",
      defensiveMidfield: "守備的MF",
      centralMidfield: "セントラルMF",
      attackingMidfield: "攻撃的MF",
      wide: "サイド",
      striker: "ストライカー",
    },
    depthLines: {
      gk: "ゴールキーパー",
      dc: "センターバック",
      rightBack: "右サイドバック",
      leftBack: "左サイドバック",
      dm: "守備的MF",
      mc: "セントラルMF",
      rightWing: "右ウイング",
      leftWing: "左ウイング",
      amc: "攻撃的MF",
      st: "ストライカー",
    } as Record<string, string>,
    positionTip: (line: string, count: number, target: number, status: string) =>
      `${line}：スカッドに${format(count)}人（通常は${format(target)}人） — ${status}`,
    brief: {
      heading: "どんな選手をお探しですか？",
      pitch: "ポジション",
      legend: "点は各ラインのスカッドの状況を示します。",
      inPossession: "ボール保持時",
      outOfPossession: "ボール非保持時",
      anyRole: "指定なし — 各選手に最適な役割",
      purpose: "目的",
      filters: "フィルター",
      minAge: "最低年齢",
      maxAge: "最高年齢",
      maxFee: "最高移籍金",
      minProbability: "獲得可能性",
      anyProbability: "指定なし",
      noFreeAgents: "フリーエージェントを除く",
    },
    purposes: {
      firstTeam: "主力",
      rotation: "ローテーション",
      future: "将来",
      any: "すべて",
    },
    purposeTips: {
      firstTeam: "このポジションの現在の最良の選手より優れている",
      rotation: "2番手と同等で、手頃な価格",
      future: "21歳以下で、伸びしろがある",
      any: "適合する全員",
    },
    ask: {
      before: "",
      after: "のアドバイス",
      anyRole: "選手ごとに最適な役割",
    },
    own: {
      heading: "あなたのスカッド",
      empty: "あなたのスカッドにはここでプレーする選手がいません。",
      position: "ポジション",
    },
    summary: (candidates: number, eligible: number, shown: number, purpose: string) =>
      `ここでプレーできる選手${format(candidates)}人 · 「${purpose}」に該当${format(eligible)}人 · おすすめ${format(shown)}人`,
    how: {
      label: "このリストはどのように作られますか？",
      note: (rule: string, count: string) =>
        `このポジションで適性10以上の選手（あなたのクラブや他の人間の監督のクラブの選手を除く）のうち、${rule}選手を、適合度（70%）と可能性（30%）を合わせて上位${count}人表示します。「ローテーション」は両者を同等に、「将来」は潜在能力も考慮します。列の見出しをクリックすると並べ替えられます。`,
    },
    purposeRules: {
      firstTeam: "現在の最良の選手よりこのポジションに適合する",
      rotation: "少なくとも2番手と同等に適合する",
      future: "21歳以下で伸びしろがある（潜在能力が現在能力より15以上高い）",
      any: "少しでも適合する",
    },
    sortBy: (by: string) => `${by}で並べ替え`,
    sortNames: {
      rank: "スカウトの順位",
      name: "名前",
      age: "年齢",
      ca: "現在能力",
      pa: "潜在能力",
      fit: "適合度",
      probability: "獲得可能性",
      fee: "移籍金",
      similarity: "類似度",
    },
    backToScoutOrder: "スカウトの順位に戻す",
    showMore: (count: number) => `さらに${format(count)}人を表示`,
    playsFor: (club: string) => `${club}でプレー中`,
    empty: "この設定ではこのポジションのアドバイスはありません。目的を「すべて」にするか、フィルターを緩めてみてください。",
    columns: {
      rank: "#",
      ca: "CA",
      pa: "PA",
      player: "選手",
      age: "年齢",
      fit: "適合度",
      role: "役割",
      probability: "可能性",
      fee: "推定移籍金",
      wage: "給与",
      note: "スカウトのメモ",
      money: "移籍金",
      value: "市場価値",
    },
    probabilityInfo:
      "選手があなたのクラブに加入する可能性 — 市場価値・契約・クラブ・評価から見積もったものです。",
    probabilityInfoLabel: "獲得可能性とは？",
    fitTitle: (inPossession: string | null, outOfPossession: string | null, position: string) =>
      [
        inPossession !== null && `ボール保持時：${inPossession}`,
        outOfPossession !== null && `ボール非保持時：${outOfPossession}`,
        `ポジション：${position}`,
      ]
        .filter(Boolean)
        .join("\n"),
    note: "適合度はエディター独自の役割ごとの能力値の重みを使います。移籍金・給与・可能性は推定値です。",
    depth: {
      summary: (size: number, age: string | null, level: string) =>
        `選手${format(size)}人${age === null ? "" : ` · 平均年齢 ${age}`} · ベストイレブンの平均能力 ${level}`,
      weak: "スカッドの水準以下",
      ageing: "高齢化",
      cover: (names: string) => `ここでもプレー可能：${names}`,
      advice: "アドバイスを見る",
      adviceTitle: "このラインの補強アドバイス",
      empty: "なし",
      ability: "現在能力",
      more: (count: number) => `+${format(count)}人`,
      columns: {
        line: "ライン",
        status: "状態",
        count: "人数",
        players: "能力順",
        cover: "ここでもプレー可能",
        age: "平均年齢",
      },
      countTitle: (count: number, target: number) =>
        `最適ポジションがこのラインの選手${format(count)}人。スカッドには通常${format(target)}人います`,
      statusHelp: {
        missing: "ここでプレーする選手がいません。",
        thin: "通常のスカッドより少ない状態です。カバーできる選手は0.5人として数えます。",
        fine: "通常のスカッドとほぼ同じです。",
        crowded: "通常のスカッドより2人以上多い状態です。",
      },
      attention: "要確認：",
      allFine: "すべてのラインのバランスが取れています。",
      /** The switch between the pitch and the table. */
      views: { label: "スカッドの表示", pitch: "ピッチ", table: "表" },
      pitchLabel: "ピッチ上のスカッド（ライン別）",
      /** Under a line on the pitch: how many players of other lines can play there. */
      coverCount: (count: number) => `${format(count)}人がカバー可能`,
      /** The button under a line picked on the pitch. */
      adviceFor: (position: string) => `${position}の補強アドバイス`,
    },
    departures: {
      intro: "スカウトが放出をすすめる選手（優先度の高い順）。",
      filter: "アドバイス",
      all: "すべて",
      empty: "今のところスカウトは誰も放出をすすめていません。",
      sortNames: {
        rank: "スカウトの順位",
        name: "名前",
        age: "年齢",
        ca: "現在能力",
        pa: "潜在能力",
        value: "市場価値",
        wage: "給与",
        contract: "契約満了日",
      },
      columns: {
        player: "選手",
        age: "年齢",
        ability: "能力",
        value: "市場価値",
        wage: "給与",
        contract: "契約期限",
        advice: "アドバイス",
        reasons: "理由",
      },
      actions: { sell: "売却", loan: "ローン放出", release: "契約解除" },
      rank: (line: string, rank: number) => `${line} · ${rank}番手`,
    },
    /** The actions at the end of a row of players the scout found, and on a player he would let go. */
    actions: {
      column: "操作",
      compare: "スカッドと比較",
      compareLabel: (name: string) => `${name}をスカッドと比較`,
      similar: "似た選手を探す",
      similarLabel: (name: string) => `${name}に似た選手を探す`,
      report: "スカウトレポート",
      reportLabel: (name: string) => `${name}のスカウトレポート`,
      replacement: "後釜を探す",
      replacementLabel: (name: string) => `${name}の後釜を探す`,
      replacementTitle: "彼に似ていて、代わりを務められる選手",
    },
    /**
     * What makes a player an opportunity, by code: `value` is the reason's value as text (days, an amount, a count,
     * a potential), `against` his value for a release clause (null when he is not for sale).
     */
    why: {
      freeAgent: () => "フリーエージェント",
      expiring: (value: string) => `契約があと${value}日で満了`,
      releaseClause: (value: string, against: string | null) =>
        against === null ? `契約解除条項 ${value}` : `契約解除条項 ${value}（市場価値 ${against}）`,
      unhappy: (value: string) => (value === "1" ? "所属クラブに不満" : `所属クラブに不満（理由${value}件）`),
      inTheRed: (value: string) => `所属クラブが赤字（${value}）`,
      listed: () => "移籍リスト入り",
      loanListed: () => "ローンリスト入り",
      wonderkid: (value: string) => `潜在能力 ${value}`,
    } as Record<string, (value: string, against: string | null) => string>,
    /** How a player the scout found compares with the club's best player at his position. */
    verdicts: {
      better: "あなたの1番手より上",
      close: "あなたの1番手に近い",
      below: "あなたの1番手より下",
      none: "スカッドにここでプレーする選手がいません",
    },
    /** How likely a player is to join, in words, by the probability: 70% and above, 50% and above, below. */
    chances: { likely: "加入しそう", possible: "加入の可能性あり", hard: "獲得は難しい" },
    opportunities: {
      kindsLabel: "狙い目のリスト",
      kinds: {
        bosman: "ボスマン移籍",
        releaseClause: "契約解除条項",
        unhappy: "不満を抱える選手",
        inTheRed: "赤字のクラブ",
        listed: "移籍リスト",
        loanListed: "ローンリスト",
        wonderkid: "ワンダーキッド",
      } satisfies Record<OpportunityKind, string>,
      hints: {
        bosman: "フリーエージェントと、6か月以内に契約が満了する選手",
        releaseClause: "市場価値より低い契約解除条項",
        unhappy: "所属クラブに不満",
        inTheRed: "所属クラブが資金を必要としている",
        listed: "所属クラブが売却に応じる",
        loanListed: "所属クラブがローンに出してもよい",
        wonderkid: "19歳以下で将来性が非常に高い",
      } satisfies Record<OpportunityKind, string>,
      countLabel: "このリストの選手数",
      /** "34", or "300+" for a list that holds more. */
      count: (count: number, more: boolean) => (more ? `${format(count)}+` : format(count)),
      position: "ポジション",
      anyPosition: "指定なし",
      maxAge: "最高年齢",
      maxFee: "最高移籍金",
      betterOnly: "自分の1番手より上のみ",
      betterOnlyTitle: "そのポジションへの適合度があなたの最良の選手を上回る選手だけ",
      summary: (kind: string, lowest: string, highest: string, pool: string) =>
        `${kind} · 現在能力${lowest}〜${highest}の選手（スカッドの水準前後） · ${pool}人を調査`,
      how: {
        label: "これらのリストはどのように作られますか？",
        note: "現在能力があなたのベスト11に近い（30低いものから45高いものまで）選手で、あなたのクラブと他の人間の監督のクラブの選手は除きます。各選手は、最も得意なポジション（またはあなたが選んだポジション）で評価します。各リストは、適合度と可能性を合わせた順に並びます。",
      },
      empty: "この条件に該当する選手はいません。",
      emptyWonderkids: "この条件に該当するワンダーキッドはいません。",
      better: "ここで1番手より上",
      columns: { position: "ポジション", why: "理由" },
    },
    similar: {
      intro: "選手を1人選ぶと、似た選手を探します。そのポジションで必要な能力値を比べます。",
      search: "比較する選手",
      searchPlaceholder: "名前で選手を検索…",
      noMatch: "その名前の選手はいません。",
      quickPicks: "またはあなたの選手から選ぶ：",
      change: "別の選手を選ぶ",
      reference: "似た選手の基準",
      position: "比較するポジション",
      cheaper: "より安い",
      cheaperTitle: "彼より市場価値が低い選手だけ",
      younger: "より若い",
      youngerTitle: "彼より若い選手だけ",
      maxFee: "最高移籍金",
      value: "市場価値",
      notForSale: "非売品",
      doesNotPlay: (position: string) => `彼は${position}でプレーしません：能力値だけを比べます。`,
      summary: (candidates: string, shown: string, position: string) =>
        `${position}でプレーする選手${candidates}人 · 最も似た${shown}人`,
      how: {
        label: "類似度はどのように測りますか？",
        note: "スカウトは、そのポジションの役割が重視する能力値を比べ、特に重視されるものをより大きく数えます。能力の高さより、選手の強みと弱みの付き方のほうが重要なので、より安い、またはより若い選手でも、とてもよく似ていることがあります。",
      },
      empty: "この設定で似た選手はいません。",
      columns: { similarity: "類似度", value: "市場価値" },
      similarityTitle: (value: number) => `${format(value)}%類似`,
    },
    compare: {
      title: "スカッドと比較",
      hint: (position: string, name: string) =>
        `比較相手は${position}のあなたの最良の選手、${name}です。役割の重要な能力値を先に並べています。`,
      noStarter: "スカッドにこのポジションでプレーする選手がいません。",
      starter: "あなたの1番手",
      candidate: "候補",
      inPossession: "ボール保持時",
      outOfPossession: "ボール非保持時",
      add: "選手を追加",
      addNone: "リストから選ぶ…",
      remove: (name: string) => `${name}を比較から外す`,
      removeShort: "外す",
      scoutView: "スカウトの見解",
      rows: {
        fit: "適合度",
        position: (position: string) => `${position}では`,
        roleRating: (role: string) => `${role}として`,
        probability: "獲得可能性",
        fee: "推定移籍金",
        wage: "給与",
        contract: "契約期限",
        verdict: "評価",
      },
      ownPlayer: "あなたの選手",
      roleAttributes: (roles: string) => `役割の能力値：${roles}`,
      keyAttribute: "役割の重要な能力値",
      versus: (difference: string) => `1番手との差：${difference}`,
      best: "最高",
      age: (age: number) => `${format(age)}歳`,
      allAttributes: "すべての能力値",
      loading: "選手を読み込み中…",
      close: "閉じる",
    },
    report: {
      title: (name: string) => `スカウトレポート：${name}`,
      hint: "画像として保存するか、コピーして共有できます。",
      making: "レポートを作成中…",
      failed: (reason: string) => `レポートを作成できませんでした：${reason}`,
      alt: (name: string) => `${name}のスカウトレポート`,
      save: "画像として保存",
      savePdf: "PDFとして保存",
      saving: "保存中…",
      copy: "画像をコピー",
      copied: "クリップボードにコピーしました。",
      copyFailed: (reason: string) => `画像をコピーできませんでした：${reason}`,
      similar: "似た選手を探す",
      saved: (file: string) => `${file}として保存しました。`,
      open: "開く",
      show: "フォルダーで表示",
      close: "閉じる",
      /** The texts on the picture itself. */
      heading: "スカウトレポート",
      age: (age: number) => `${format(age)}歳`,
      freeAgent: "フリーエージェント",
      contract: "契約期限",
      fit: "適合度",
      probability: "獲得可能性",
      fee: "推定移籍金",
      abilities: "CA / PA",
      value: "市場価値",
      role: "役割",
      strengths: "長所",
      weaknesses: "短所",
      profile: "性格",
      note: "スカウトのメモ",
      similarity: (value: number) => `${format(value)}%類似`,
      footer: "FMLibreEditor スカウトレポート · 移籍金・給与・獲得可能性は推定値です",
      traits: {
        consistent: "安定している",
        inconsistent: "ムラがある",
        bigGames: "ビッグゲームに強い",
        nervous: "大一番に弱い",
        injuryProne: "怪我をしやすい",
        robust: "怪我をしにくい",
        versatile: "万能型",
        professional: "模範的なプロ",
        ambitious: "野心家",
        loyal: "忠実",
        hotHeaded: "短気",
      },
    },
    /** "Youth intake": the players the game made at a club's youth intakes, by the day they joined it, and their edits. */
    youth: {
      intro: "ゲームがクラブのユース入団で生み出した、現在も在籍している選手を、入団した日ごとに表示します。",
      otherClub: "他のクラブを見る",
      searchLabel: "見るクラブ",
      mine: "自分のクラブに戻る",
      intakesLabel: "ユース入団",
      /** A day nothing says. */
      noDay: "日付不明",
      /** `best` is a name and the potential in brackets. */
      summary: (count: number, average: string, best: string) =>
        `選手${format(count)}人 · 平均潜在能力 ${average} · 最高：${best}`,
      lent: (count: number) => `ローン中${format(count)}人`,
      how: {
        label: "このリストはどのように作られますか？",
        note: "ゲームが生み出した選手のうち、17歳以下でこのクラブに加入し、他のクラブでは育成されていない選手を、加入した日ごとにまとめています。ローン中の選手は含まれ、売却または放出された選手は含まれません。",
      },
      unmarked:
        "このバージョンのゲームが生み出した選手にどのように印を付けているか、エディターは把握していません。そのため、ゲームのデータベースにあるクラブ自身の若手選手も表示されます。",
      empty: (club: string) => `${club}には現在ユース入団選手がいません。`,
      emptyHint: "入団した選手は、クラブに在籍している間ここに表示されます。他のクラブを見ると、そのユース入団を確認できます。",
      columns: {
        player: "選手",
        position: "Pos",
        born: "生年月日",
        nation: "国籍",
        city: "出身地",
        ca: "CA",
        pa: "PA",
        actions: "編集",
      },
      age: (age: number) => `${format(age)}歳`,
      joinedAt: (age: number) => `${format(age)}歳で加入`,
      onLoan: (club: string) => `${club}にローン中`,
      youthContract: "ユース契約",
      edit: (name: string) => `${name}を編集`,
      editor: {
        label: (name: string) => `${name}を編集中`,
        reading: "値を読み込み中…",
        dateOfBirth: "生年月日",
        nation: "国籍",
        city: "出身地",
        /** The city select of a player without a city: the game keeps none for him, and the editor sets none. */
        noCity: "ゲームに登録なし",
        /** Above the cities of the nation picked: they are the ones people of the save were born in. */
        cityHint: "このセーブの人物が生まれた都市",
        ca: "現在能力",
        pa: "潜在能力",
        save: "保存",
        saving: "保存中…",
        cancel: "キャンセル",
        profile: "完全なプロフィール",
        profileTitle: "選手のプロフィールで、ポジション・能力値などを確認できます",
        nothing: "保存するものがありません：値は変更されていません。",
        saved: (count: number) => `${format(count)}件の変更を保存しました。`,
        failed: (field: string, reason: string) => `${field}：${reason}`,
        invalid: (field: string) => `${field}：設定できない値です。`,
      },
      loading: "ユース入団を読み込み中…",
      failed: (reason: string) => `ユース入団を読み込めませんでした：${reason}`,
    },
    roles: {
      bgk: "ボールプレイングゴールキーパー",
      ngk: "ノーナンセンスゴールキーパー",
      sk: "スイーパーキーパー",
      lhk: "ラインホールディングキーパー",
      cb: "センターバック",
      bcb: "ボールプレイングセンターバック",
      ncb: "ノーナンセンスセンターバック",
      acb: "アドバンスドセンターバック",
      ocb: "オーバーラッピングセンターバック",
      scb: "ストッピングセンターバック",
      ccb: "カバーリングセンターバック",
      wcb: "ワイドセンターバック",
      fb: "サイドバック",
      ifb: "インバーテッドサイドバック",
      pfb: "プレッシングサイドバック",
      hfb: "ホールディングサイドバック",
      wb: "ウィングバック",
      iwb: "インサイドウィングバック",
      pwb: "プレイメーキングウィングバック",
      awb: "アドバンスドウィングバック",
      hwb: "ホールディングウィングバック",
      dm: "守備的ミッドフィルダー",
      hb: "ハーフバック",
      ddm: "ドロッピング守備的ミッドフィルダー",
      pdm: "プレッシング守備的ミッドフィルダー",
      wdm: "ワイドカバーリング守備的ミッドフィルダー",
      bbm: "ボックストゥボックスミッドフィルダー",
      bbp: "ボックストゥボックスプレイメーカー",
      dlp: "ディープライイングプレイメーカー",
      cm: "センターミッドフィルダー",
      pcm: "プレッシングセンターミッドフィルダー",
      scm: "スクリーニングセンターミッドフィルダー",
      chm: "チャンネルミッドフィルダー",
      wcm: "ワイドセンターミッドフィルダー",
      ap: "アドバンスドプレイメーカー",
      am: "攻撃的ミッドフィルダー",
      oam: "センターアウトレット攻撃的ミッドフィルダー",
      w: "ウィング",
      if: "インサイドフォワード",
      iw: "インサイドウィング",
      pw: "プレイメーキングウィング",
      wfd: "サイドフォワード",
      tw: "トラッキングウィング",
      iow: "インサイドアウトレットウィング",
      wow: "ワイドアウトレットウィング",
      cfd: "センターフォワード",
      dlf: "ディープライイングフォワード",
      chf: "チャンネルフォワード",
      p: "ポーチャー",
      tcf: "トラッキングセンターフォワード",
      ocf: "センターアウトレットセンターフォワード",
      gk: "ゴールキーパー",
      wm: "サイドハーフ",
    } as Record<string, string>,
    reasons: {
      listed: () => "移籍リスト入り",
      freeAgent: () => "フリーエージェント",
      expiring: (value: string) => `契約満了まで${value}日`,
      releaseClause: (value: string) => `契約解除条項 ${value}`,
      fringe: () => "所属クラブでレギュラーではない",
      keyPlayer: () => "所属クラブの主力選手",
      unwanted: () => "所属クラブで構想外",
      overBudget: (value: string) => `予算を${value}超過`,
      stretch: (value: string) => `予算をわずかに超過（+${value}）`,
      wageHigh: (value: string) => `給与が余裕を週${value}上回る`,
      biggerClub: () => "より大きなクラブでプレー中",
      smallerClub: () => "より小さなクラブでプレー中",
      reputationGap: () => "あなたのクラブには大物すぎる",
      ambitious: () => "野心的：ステップアップを歓迎する",
      notForSale: () => "売却不可",
    } as Record<string, (value: string) => string>,
    departureReasons: {
      surplus: (value: string) => `ラインが過剰（${value}人）`,
      belowLevel: () => "スカッドの水準以下",
      ageing: (value: string) => `高齢化（${value}歳）`,
      expiring: (value: string) => `契約満了まで${value}日`,
      highWage: (value: string) => `役割に対して給与が高い（週${value}）`,
      unhappy: () => "不満を抱えている",
      lowMorale: () => "士気が低い",
      blocked: () => "成長には出場機会が必要",
      unwanted: () => "チーム内の立場：構想外",
      listed: () => "すでに移籍リスト入り",
    } as Record<string, (value: string) => string>,
  },

  /** Recipes (`RecipeMenu`): see `en.ts`. */
  recipes: {
    button: "レシピ",
    buttonTitle: "用意された変更のセット。書き込む前にプレビューします",
    names: {
      wonderkid: "ワンダーキッドにする",
      injuryProof: "負傷しにくくする",
      longCareer: "キャリアを延ばす",
      richClub: "クラブを裕福にする",
      topFacilities: "施設を最高にする",
    },
    notes: {
      wonderkid: "21歳以下：潜在能力を180以上、現在能力と能力値を年齢相応に。すでに高い値はそのまま。",
      injuryProof: "負傷しやすさ1、回復力20、スタミナ15以上、現在の負傷を治療。",
      longCareer: "予定された引退を取り消し、契約をあと3年以上、回復力20、プロ意識18以上。",
      richClub: "残高、移籍予算、給与予算を最も裕福なクラブの水準に。",
      topFacilities: "5つの施設をすべて20に。",
    },
    tooOld: (oldest: number) => `${oldest}歳以下の選手向け`,
    command: (recipe: string) => `レシピ：${recipe}`,
    working: "変更を計算中…",
    summary: (changes: number, kept: number, left: number) =>
      [changeCount(changes), kept > 0 && `${format(kept)}件はすでに十分な値`, left > 0 && valuesLeftAlone(left)]
        .filter(Boolean)
        .join(" · "),
    tableLabel: "レシピで行われる変更",
    keptHeading: (count: number) => `${format(count)}件の値はそのまま：すでに十分`,
    keptLabel: "すでに十分な値",
    valueColumn: "値",
    leftLabel: "レシピで変更しないもの",
    undo: "このレシピを元に戻す",
    undoTitle: "このレシピが変更したすべてをゲームに書き戻します",
  },

  /** A player's development: the Development tab of his profile, the note under his abilities, the squad's arrows (see en.ts). */
  progress: {
    tabsLabel: "選手プロフィールのセクション",
    tabs: { overview: "プロフィール", progress: "成長" },
    lockedWhileEdited: "このタブを開くには編集を終了してください",
    openTab: "成長タブを開く",
    loading: "記録を読み込み中…",
    failed: (reason: string) => `記録を読み込めませんでした：${reason}`,
    since: (date: string) => `${date}以降`,
    change: (from: string, to: string, date: string) => `${date}以降 ${from} → ${to}`,
    rangeLabel: "期間",
    ranges: { quarter: "3か月", year: "1年", all: "すべて" },
    recorded: (count: number, first: string) => `記録：${count}件 · 最初の記録 ${first}`,
    abilityTitle: "能力",
    valueTitle: "市場価値",
    attributesTitle: "変化した能力値",
    noAttributeChanges: (date: string) => `${date}以降、変化した能力値はありません。`,
    emptyTitle: "比較できる記録がまだありません",
    emptyText:
      "アプリはゲームのデータを読み込むたびに、ゲーム内時間でおよそ週に1回、全選手の能力、市場価値、能力値を記録します。ゲームを進めてデータを再読み込みすると、この選手の成長がここに表示されます。",
    offTitle: "このセーブの記録はありません",
    offText:
      "アプリが記録を残すのは、あなたが操作する監督がいるセーブで、データがアプリのチェックに通るゲームバージョンの場合です。",
  },

  /** The command palette and the names of the keys in the keyboard shortcuts (see en.ts). */
  palette: {
    button: "検索",
    title: "検索またはコマンドを実行",
    placeholder: "選手、スタッフ、クラブ、コマンドを検索",
    placeholderCommands: "コマンドを検索",
    commands: "コマンド",
    goTo: (list: string) => `${list}へ移動`,
    searchList: "このリストを検索",
    editProfile: "このプロフィールを編集",
    doneEditing: "このプロフィールの編集を終了",
    applyChanges: "このプロフィールの変更を適用",
    showAll: (count: number, list: string) => `${list}で${format(count)}件すべてを表示`,
    searching: "検索中…",
    empty: (query: string) => `「${query}」に一致するものはありません。`,
    notConnected: "選手、スタッフ、クラブを検索するには、ゲームに接続してください。",
    failed: (reason: string) => `検索に失敗しました：${reason}`,
    hintMove: "移動",
    hintOpen: "開く",
    hintClose: "閉じる",
    keys: { ctrl: "Ctrl", shift: "Shift", enter: "Enter", escape: "Esc" },
  },

  /** "My club", the page the app opens on (see en.ts). */
  home: {
    nav: "マイクラブ",
    loading: "クラブを検索中…",
    failed: (reason: string) => `クラブを検索できませんでした：${reason}`,
    manager: (name: string) => `監督：${name}`,
    following: "フォロー中のクラブ",
    clubsLabel: "あなたのクラブ",
    openProfile: "クラブのプロフィール",
    openProfileTitle: "このクラブを「クラブ」タブで開く：施設、財務、スタジアムなど",
    noClubTitle: "このセーブデータでは指揮しているクラブがありません",
    noClubText:
      "代わりに、ここでフォローするクラブを選んでください：スカッド、注意が必要な選手、チーム全体への操作を表示します。",
    chooseAnother: "別のクラブを選ぶ",
    searchLabel: "フォローするクラブ",
    squad: "スカッド",
    cards: {
      label: "注意が必要な選手",
      lowMorale: "士気が低い",
      tired: "疲労",
      contracts: "契約満了が近い",
      injuredHint: "負傷している選手",
      bannedHint: "出場停止中の選手",
      lowMoraleHint: (below: string) => `士気が${below}未満の選手`,
      tiredHint: (below: string) => `コンディションが${below}未満の選手`,
      unrestHint: "チームメイトの一部が不満を持っている選手",
      contractsHint: (months: number) => `契約が${months}か月以内に満了する選手`,
      none: "なし",
      more: (count: number) => `ほか${format(count)}人`,
    },
  },

  /** What's new: what a version brings (see en.ts). */
  whatsNew: {
    title: (version: string) => `バージョン ${version} の新機能`,
    updated: "FMLibreEditor が更新されました。",
    version: (version: string) => `バージョン ${version}`,
    thanks: (names: string) => `${names} の皆さん、ありがとうございます。`,
    allChanges: "すべての変更",
    allChangesTitle: "このバージョンの全ノートを GitHub で開く",
    close: "OK",
    link: "新機能",
    command: "このバージョンの新機能",
    versions: {
      "0.5.5": [
        {
          title: "FM 27.1.1：",
          text: "11 月 24 日のアップデートに Game Pass、Steam、Mac で対応し、これまでどおりすべて動きます。今後アップデートが出たときも、それに対応したバージョンが出るまで、クラブの財政と使用中の戦術を読み続けます。",
        },
        {
          title: "「大会」タブ：",
          text: "各大会の選手登録ルール（登録できる外国人選手の数など）を、今シーズンと来シーズンに分けて確認・変更できます。Windows と Apple シリコン搭載の Mac で使えます。",
        },
        {
          title: "レンタル：",
          text: "「移籍」ダイアログの新しい「レンタル」で、移籍期間中でも期間外でも、ゲーム内の翌日にレンタル移籍を手配します。最終日、相手クラブが負担する給与の割合、月額の手数料、必要なら買い取りオプションを設定できます。Windows と Apple シリコン搭載の Mac で使えます。",
        },
        {
          title: "レシピ：",
          text: "選手やクラブ向けの、すぐに使える変更のセットです。「ワンダーキッドにする」「負傷しにくくする」「キャリアを延ばす」「クラブを裕福にする」「施設を最高にする」の 5 つがあり、書き込む前に何が変わるかを表示します。1 回の「元に戻す」で取り消せます。",
        },
        {
          title: "成長：",
          text: "アプリはゲームを読み込むときに、ゲーム内の 1 週間ごとに全選手を記録します。選手のプロフィールの新しい「成長」タブで、あなたのキャリアを通じた能力、潜在能力、価値、能力値の推移を見られます。",
        },
        {
          title: "B チーム：",
          text: "クラブのスカッドタブに、自クラブのチームのあとで B チーム（レアル・マドリードならカスティージャ）が表示され、チームの操作もそのまま使えます。",
        },
        {
          title: "短い説明：",
          text: "ボタンの説明は 1 行になり、ウィンドウを横切る長い帯ではなく小さな枠に表示されます。",
        },
      ],
      "0.5.4": [
        {
          title: "移籍が選手の経歴に：",
          text: "選手を移動するときの最初の選択肢になった「移籍」は、移籍をゲーム内の翌日に手配します。ゲームは自分の移籍と同じように実行し、移籍金を支払って選手の経歴に記録します。今シーズンの元のクラブでの試合は別の行に残ります。「今すぐ移動」はこれまでどおりすぐに移動します。",
        },
        {
          title: "チームを万全の状態に、そして最悪の状態に：",
          text: "クラブのスカッドタブで、ワンクリックでチーム全員を治療・鼓舞・回復し、連携と戦術を最大にします。「チームを最悪の状態に」は確認のあとで逆のことをします。どちらも 1 回の「元に戻す」で取り消せます。個別の操作は「その他の操作」にあります。",
        },
        {
          title: "チーム特徴の一括設定：",
          text: "クラブのスカッドタブの「その他の操作」にある「チーム特徴の一括設定」で、選んだ特性をチームの全選手に追加、または削除します。ほかの特性はそのままです。1 回の「元に戻す」で取り消せます。",
        },
        {
          title: "全スタッフの移籍：",
          text: "クラブのスタッフタブから、スタッフ全員を一度に別のクラブへ、それぞれ同じ役職のまま移籍させます。1 回の「元に戻す」で全員が戻ります。",
        },
        {
          title: "代表チーム：",
          text: "代表チームの A 代表に「全員を治療」「全員を鼓舞」「全員を回復」が加わり、スカッドの表にコンディション、試合勘、士気が表示されます。",
        },
        {
          title: "スポンサー契約：",
          text: "クラブの財務にスポンサー契約を読み取り専用で表示します。各契約のシーズンごとと合計の金額、期間、降格時に変わる内容がわかります。現在は Game Pass 0.9.2524.0 のみです。",
        },
        {
          title: "修正：",
          text: "一部のキャリアで、スタッフを正しく読み取れているのにスタッフのチェックが失敗し、スタッフが読み取り専用になって、治療、「連携を最大化」、「戦術を最大化」が拒否されていました。今は通ります。",
        },
      ],
      "0.5.3": [
        {
          title: "FM27 の 11 月 17 日のアップデート：",
          text: "Windows と macOS では Game Pass 0.9.2524.0 と Steam ビルド 26620374 に対応しました。アップデートで位置が変わったクラブの財務と、チームが使う戦術を再び読み取れます。",
        },
        {
          title: "代表チーム：",
          text: "クラブ一覧の上の切り替えで、各国の男子と女子の代表チームを表示します。チームのスカッド、ユースチーム（U-21、U-20 など）とそのスカッド、それぞれの評価を確認でき、評価は編集できます。",
        },
        {
          title: "リーグの賞金：",
          text: "クラブの概要に、所属リーグが今シーズン支払う賞金を最終順位別と試合ごとに表示します。金額はシーズン終了まで、リーグの全クラブ分を変更できます。",
        },
        {
          title: "修正：",
          text: "ユース選手が 2020 年以降に生まれたセーブでも、エディターが書き込み前に行うチェックで止まらなくなりました。",
        },
      ],
      "0.5.2": [
        {
          title: "マイクラブ：",
          text: "アプリは指揮するクラブのページで開きます。注目すべき選手、クラブの資金、スカッドの操作を一か所にまとめました。自分のクラブがない場合は、クラブをフォローできます。",
        },
        {
          title: "コマンドパレット：",
          text: "Ctrl+K（Mac では ⌘K）で選手、スタッフ、クラブ、コマンドを探せます。ショートカットでタブ間も移動できます。",
        },
        {
          title: "スカウト：",
          text: "市場のお買い得、手放す選手に似た選手、同じポジションの No.1 との比較、画像や PDF で保存できるスカウトレポート、ピッチ上のスカッド、ユース入団。",
        },
        {
          title: "選手の名前を変更：",
          text: "名、姓、通称、フルネームを変更できます。新しい名前はゲームのセーブデータにも残ります。",
        },
        {
          title: "契約とスタッフ：",
          text: "ワンクリックで契約を5年延長でき、一括編集なら多くの選手に年数を追加できます。スタッフ個人やクラブの全スタッフを契約解除しても、元に戻すで一度に復元できます。",
        },
        {
          title: "戦術を最大化：",
          text: "クラブの「スカッド」タブで、チームの戦術理解度を最大にします。不満の理由も、ゲームと同じ表現で表示されるようになりました。",
        },
        {
          title: "変更を保存：",
          text: "各キャリアの変更は、再起動後も「変更履歴」タブに残り、検索、絞り込み、書き出しができます。",
        },
        {
          title: "クラブのフィルター：",
          text: "国、リーグ、評価で絞り込めます。一括編集と書き出しは、リストに表示されているクラブが対象です。",
        },
        {
          title: "ロシア語と日本語：",
          text: "言語が2つ増えました。11月12日の Steam アップデートも、対応済みのビルドになりました。",
        },
      ],
    } as Record<string, { title: string; text: string }[]>,
  },

  errors,
};
