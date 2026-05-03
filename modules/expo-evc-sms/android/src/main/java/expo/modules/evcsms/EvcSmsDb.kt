package expo.modules.evcsms

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class EvcSmsDb(context: Context) : SQLiteOpenHelper(context, "evc_sms.db", null, 3) {
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
  }

  fun insert(parsed: EvcSmsParsed) {
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
    db.insert("evc_queue", null, cv)
  }

  private fun rowMapFromCursor(it: Cursor): Map<String, Any?> {
    val id = it.getLong(0)
    return mapOf(
      "id" to id,
      "provider" to it.getString(1),
      "sender" to it.getString(2),
      "kind" to it.getString(3),
      "amount" to if (it.isNull(4)) null else it.getDouble(4),
      "dateIso" to if (it.isNull(5)) null else it.getString(5),
      "tarRaw" to if (it.isNull(6)) null else it.getString(6),
      "phone" to if (it.isNull(7)) null else it.getString(7),
      "name" to if (it.isNull(8)) null else it.getString(8),
      "merchantName" to if (it.isNull(9)) null else it.getString(9),
      "noticeSummary" to if (it.isNull(10)) null else it.getString(10),
      "subId" to if (it.isNull(11)) null else it.getLong(11),
      "slot" to if (it.isNull(12)) null else it.getInt(12),
      "rawType" to if (it.isNull(13)) null else it.getString(13),
      "reference" to if (it.isNull(14)) null else it.getString(14),
      "transactionId" to if (it.isNull(15)) null else it.getString(15),
      "accountNumber" to if (it.isNull(16)) null else it.getString(16),
      "balance" to if (it.isNull(17)) null else it.getDouble(17),
      "currency" to if (it.isNull(18)) null else it.getString(18),
      "note" to if (it.isNull(19)) null else it.getString(19),
      "createdAt" to it.getLong(20),
    )
  }

  fun peek(limit: Int = 50): List<Map<String, Any?>> {
    val db = writableDatabase
    val out = mutableListOf<Map<String, Any?>>()
    val cursor = db.rawQuery(
      """
      SELECT id,provider,sender,kind,amount,date_iso,tar_raw,phone,name,merchant_name,notice_summary,sub_id,slot,
      raw_type,reference,txn_ref,account_number,balance,currency,note,created_at
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
