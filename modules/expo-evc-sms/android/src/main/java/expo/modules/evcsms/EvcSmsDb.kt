package expo.modules.evcsms

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class EvcSmsDb(context: Context) : SQLiteOpenHelper(context, "evc_sms.db", null, 1) {
  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL(
      """
      CREATE TABLE IF NOT EXISTS evc_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        kind TEXT NOT NULL,
        amount REAL,
        date_iso TEXT,
        tar_raw TEXT,
        phone TEXT,
        name TEXT,
        merchant_name TEXT,
        notice_summary TEXT,
        created_at INTEGER NOT NULL
      )
      """.trimIndent()
    )
    db.execSQL("CREATE INDEX IF NOT EXISTS idx_evc_queue_created_at ON evc_queue(created_at)")
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    // v1 only
  }

  fun insert(parsed: EvcSmsParsed) {
    val db = writableDatabase
    val cv = ContentValues()
    cv.put("sender", parsed.sender)
    cv.put("kind", parsed.kind)
    if (parsed.amount != null) cv.put("amount", parsed.amount) else cv.putNull("amount")
    cv.put("date_iso", parsed.dateIso)
    cv.put("tar_raw", parsed.tarRaw)
    cv.put("phone", parsed.phone)
    cv.put("name", parsed.name)
    cv.put("merchant_name", parsed.merchantName)
    cv.put("notice_summary", parsed.noticeSummary)
    cv.put("created_at", System.currentTimeMillis())
    db.insert("evc_queue", null, cv)
  }

  fun fetchAndClear(limit: Int = 50): List<Map<String, Any?>> {
    val db = writableDatabase
    val out = mutableListOf<Map<String, Any?>>()
    val cursor = db.rawQuery(
      "SELECT id,sender,kind,amount,date_iso,tar_raw,phone,name,merchant_name,notice_summary,created_at FROM evc_queue ORDER BY id ASC LIMIT ?",
      arrayOf(limit.toString())
    )
    val ids = mutableListOf<Long>()
    cursor.use {
      while (it.moveToNext()) {
        val id = it.getLong(0)
        ids.add(id)
        out.add(
          mapOf(
            "id" to id,
            "sender" to it.getString(1),
            "kind" to it.getString(2),
            "amount" to if (it.isNull(3)) null else it.getDouble(3),
            "dateIso" to if (it.isNull(4)) null else it.getString(4),
            "tarRaw" to if (it.isNull(5)) null else it.getString(5),
            "phone" to if (it.isNull(6)) null else it.getString(6),
            "name" to if (it.isNull(7)) null else it.getString(7),
            "merchantName" to if (it.isNull(8)) null else it.getString(8),
            "noticeSummary" to if (it.isNull(9)) null else it.getString(9),
            "createdAt" to it.getLong(10)
          )
        )
      }
    }
    if (ids.isNotEmpty()) {
      val where = "id IN (" + ids.joinToString(",") + ")"
      db.delete("evc_queue", where, null)
    }
    return out
  }
}

