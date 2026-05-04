package expo.modules.evcsms

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class EvcSmsDb(context: Context) : SQLiteOpenHelper(context, "evc_sms.db", null, 4) {
  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL(
      """
      CREATE TABLE IF NOT EXISTS evc_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL DEFAULT 'evc',
        sender TEXT NOT NULL,
        kind TEXT NOT NULL,
        amount REAL,
        date_iso TEXT,
        tar_raw TEXT,
        phone TEXT,
        name TEXT,
        merchant_name TEXT,
        notice_summary TEXT,
        sub_id INTEGER,
        slot INTEGER,
        raw_type TEXT,
        reference TEXT,
        txn_ref TEXT,
        account_number TEXT,
        balance REAL,
        currency TEXT,
        note TEXT,
        captured_notification_shown INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
      """.trimIndent(),
    )
    db.execSQL("CREATE INDEX IF NOT EXISTS idx_evc_queue_created_at ON evc_queue(created_at)")
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    if (oldVersion < 2) {
      db.execSQL("ALTER TABLE evc_queue ADD COLUMN sub_id INTEGER")
      db.execSQL("ALTER TABLE evc_queue ADD COLUMN slot INTEGER")
    }
    if (oldVersion < 3) {
      db.execSQL("ALTER TABLE evc_queue ADD COLUMN provider TEXT NOT NULL DEFAULT 'evc'")
      db.execSQL("ALTER TABLE evc_queue ADD COLUMN raw_type TEXT")
      db.execSQL("ALTER TABLE evc_queue ADD COLUMN reference TEXT")
      db.execSQL("ALTER TABLE evc_queue ADD COLUMN txn_ref TEXT")
      db.execSQL("ALTER TABLE evc_queue ADD COLUMN account_number TEXT")
      db.execSQL("ALTER TABLE evc_queue ADD COLUMN balance REAL")
      db.execSQL("ALTER TABLE evc_queue ADD COLUMN currency TEXT")
      db.execSQL("ALTER TABLE evc_queue ADD COLUMN note TEXT")
    }
    if (oldVersion < 4) {
      db.execSQL(
        "ALTER TABLE evc_queue ADD COLUMN captured_notification_shown INTEGER NOT NULL DEFAULT 0",
      )
    }
  }

  /** @return row id, or -1 on failure */
  fun insert(parsed: EvcSmsParsed): Long {
    val db = writableDatabase
    val cv = ContentValues()
    cv.put("provider", parsed.provider)
    cv.put("sender", parsed.sender)
    cv.put("kind", parsed.kind)
    if (parsed.amount != null) cv.put("amount", parsed.amount) else cv.putNull("amount")
    cv.put("date_iso", parsed.dateIso)
    cv.put("tar_raw", parsed.tarRaw)
    cv.put("phone", parsed.phone)
    cv.put("name", parsed.name)
    cv.put("merchant_name", parsed.merchantName)
    cv.put("notice_summary", parsed.noticeSummary)
    if (parsed.subId != null) cv.put("sub_id", parsed.subId) else cv.putNull("sub_id")
    if (parsed.slot != null) cv.put("slot", parsed.slot) else cv.putNull("slot")
    cv.put("raw_type", parsed.rawType)
    cv.put("reference", parsed.reference)
    cv.put("txn_ref", parsed.transactionId)
    cv.put("account_number", parsed.accountNumber)
    if (parsed.balance != null) cv.put("balance", parsed.balance) else cv.putNull("balance")
    cv.put("currency", parsed.currency)
    cv.put("note", parsed.note)
    cv.put("created_at", System.currentTimeMillis())
    return db.insert("evc_queue", null, cv)
  }

  fun markCapturedNotificationShown(id: Long) {
    val cv = ContentValues()
    cv.put("captured_notification_shown", 1)
    writableDatabase.update("evc_queue", cv, "id = ?", arrayOf(id.toString()))
  }

  private fun rowMapFromCursor(it: Cursor): Map<String, Any?> {
    fun idx(name: String) = it.getColumnIndexOrThrow(name)
    val id = it.getLong(idx("id"))
    return mapOf(
      "id" to id,
      "provider" to it.getString(idx("provider")),
      "sender" to it.getString(idx("sender")),
      "kind" to it.getString(idx("kind")),
      "amount" to if (it.isNull(idx("amount"))) null else it.getDouble(idx("amount")),
      "dateIso" to if (it.isNull(idx("date_iso"))) null else it.getString(idx("date_iso")),
      "tarRaw" to if (it.isNull(idx("tar_raw"))) null else it.getString(idx("tar_raw")),
      "phone" to if (it.isNull(idx("phone"))) null else it.getString(idx("phone")),
      "name" to if (it.isNull(idx("name"))) null else it.getString(idx("name")),
      "merchantName" to if (it.isNull(idx("merchant_name"))) null else it.getString(idx("merchant_name")),
      "noticeSummary" to if (it.isNull(idx("notice_summary"))) null else it.getString(idx("notice_summary")),
      "subId" to if (it.isNull(idx("sub_id"))) null else it.getLong(idx("sub_id")),
      "slot" to if (it.isNull(idx("slot"))) null else it.getInt(idx("slot")),
      "rawType" to if (it.isNull(idx("raw_type"))) null else it.getString(idx("raw_type")),
      "reference" to if (it.isNull(idx("reference"))) null else it.getString(idx("reference")),
      "transactionId" to if (it.isNull(idx("txn_ref"))) null else it.getString(idx("txn_ref")),
      "accountNumber" to if (it.isNull(idx("account_number"))) null else it.getString(idx("account_number")),
      "balance" to if (it.isNull(idx("balance"))) null else it.getDouble(idx("balance")),
      "currency" to if (it.isNull(idx("currency"))) null else it.getString(idx("currency")),
      "note" to if (it.isNull(idx("note"))) null else it.getString(idx("note")),
      "capturedNotificationShown" to (it.getInt(idx("captured_notification_shown")) == 1),
      "createdAt" to it.getLong(idx("created_at")),
    )
  }

  fun peek(limit: Int = 50): List<Map<String, Any?>> {
    val db = writableDatabase
    val out = mutableListOf<Map<String, Any?>>()
    val cursor = db.rawQuery(
      """
      SELECT id,provider,sender,kind,amount,date_iso,tar_raw,phone,name,merchant_name,notice_summary,sub_id,slot,
      raw_type,reference,txn_ref,account_number,balance,currency,note,captured_notification_shown,created_at
      FROM evc_queue ORDER BY id ASC LIMIT ?
      """.trimIndent().replace("\n", " "),
      arrayOf(limit.toString()),
    )
    cursor.use {
      while (it.moveToNext()) {
        out.add(rowMapFromCursor(it))
      }
    }
    return out
  }

  fun deleteByIds(ids: List<Long>) {
    if (ids.isEmpty()) return
    val db = writableDatabase
    val where = "id IN (" + ids.joinToString(",") + ")"
    db.delete("evc_queue", where, null)
  }
}
