package it.case247.andrea;

import android.Manifest;
import android.content.ContentUris;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.net.Uri;
import android.provider.CalendarContract;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.Locale;

public final class AgendaStore extends SQLiteOpenHelper {
    public AgendaStore(Context c) { super(c, "andrea.db", null, 1); }
    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE tasks(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,due INTEGER NOT NULL,kind TEXT,done INTEGER DEFAULT 0)");
        db.execSQL("CREATE TABLE mails(id INTEGER PRIMARY KEY AUTOINCREMENT,mailkey TEXT UNIQUE,sender TEXT,subject TEXT,preview TEXT,received INTEGER)");
        db.execSQL("CREATE TABLE school(id INTEGER PRIMARY KEY AUTOINCREMENT,weekday INTEGER,title TEXT,starttime TEXT,endtime TEXT)");
    }
    @Override public void onUpgrade(SQLiteDatabase db,int oldV,int newV) {}
    public long addTask(String title,long due,String kind) {
        android.content.ContentValues v=new android.content.ContentValues();
        v.put("title",title);v.put("due",due);v.put("kind",kind);v.put("done",0);
        return getWritableDatabase().insert("tasks",null,v);
    }
    public void markDone(long id,boolean done) {
        android.content.ContentValues v=new android.content.ContentValues();
        v.put("done",done?1:0);
        getWritableDatabase().update("tasks",v,"id=?",new String[]{String.valueOf(id)});
    }
    public void removeTask(long id) {getWritableDatabase().delete("tasks","id=?",new String[]{String.valueOf(id)});}
    public void addSchool(int day,String title,String start,String end) {
        android.content.ContentValues v=new android.content.ContentValues();
        v.put("weekday",day);v.put("title",title);v.put("starttime",start);v.put("endtime",end);
        getWritableDatabase().insert("school",null,v);
    }
    public void removeSchool(long id) {getWritableDatabase().delete("school","id=?",new String[]{String.valueOf(id)});}
    public void addMail(String key,String sender,String subject,String preview,long received) {
        android.content.ContentValues v=new android.content.ContentValues();
        v.put("mailkey",key);v.put("sender",sender);v.put("subject",subject);
        v.put("preview",preview);v.put("received",received);
        getWritableDatabase().insertWithOnConflict("mails",null,v,SQLiteDatabase.CONFLICT_IGNORE);
    }
    public JSONObject snapshot(Context context) {
        JSONObject root=new JSONObject();
        try {
            Calendar start=Calendar.getInstance();
            start.set(Calendar.HOUR_OF_DAY,0);start.set(Calendar.MINUTE,0);
            start.set(Calendar.SECOND,0);start.set(Calendar.MILLISECOND,0);
            long today=start.getTimeInMillis(); start.add(Calendar.DAY_OF_MONTH,1);
            long tomorrow=start.getTimeInMillis();start.add(Calendar.DAY_OF_MONTH,1);
            long dayAfter=start.getTimeInMillis();
            root.put("today",dayItems(context,today,tomorrow));
            root.put("tomorrow",dayItems(context,tomorrow,dayAfter));
            root.put("overdue",overdueTasks(today));
            root.put("mails",recentMails());
            root.put("school",allSchool());
            android.content.SharedPreferences pref=context.getSharedPreferences("andrea",Context.MODE_PRIVATE);
            root.put("morningHour",pref.getInt("morningHour",8));
            root.put("morningMinute",pref.getInt("morningMinute",0));
            root.put("eveningHour",pref.getInt("eveningHour",20));
            root.put("eveningMinute",pref.getInt("eveningMinute",30));
            root.put("calendarPermission",context.checkSelfPermission(Manifest.permission.READ_CALENDAR)==PackageManager.PERMISSION_GRANTED);
        }catch(Exception ignored){}
        return root;
    }
    private JSONArray dayItems(Context context,long from,long to) {
        JSONArray arr=new JSONArray();
        if(context.checkSelfPermission(Manifest.permission.READ_CALENDAR)==PackageManager.PERMISSION_GRANTED) {
            Uri.Builder b=CalendarContract.Instances.CONTENT_URI.buildUpon();
            ContentUris.appendId(b,from);ContentUris.appendId(b,to-1);
            try(Cursor c=context.getContentResolver().query(
                    b.build(), new String[]{CalendarContract.Instances.TITLE, CalendarContract.Instances.BEGIN},
                    null,null,CalendarContract.Instances.BEGIN+" ASC")) {
                if(c!=null)while(c.moveToNext()){
                    JSONObject o=new JSONObject();
                    o.put("title",c.getString(0)==null?"Appuntamento":c.getString(0));
                    o.put("when",c.getLong(1));o.put("kind","Calendario");
                    o.put("id",0);arr.put(o);
                }
            }catch(Exception ignored){}
        }
        try(Cursor c=getReadableDatabase().rawQuery("SELECT id,title,due,kind FROM tasks WHERE done=0 AND due>=? AND due<? ORDER BY due ASC",
                new String[]{String.valueOf(from),String.valueOf(to)})) {
            while(c.moveToNext()){
                JSONObject o=new JSONObject();o.put("id",c.getLong(0));o.put("title",c.getString(1));
                o.put("when",c.getLong(2));o.put("kind",c.getString(3)==null?"Attività":c.getString(3));arr.put(o);
            }
        }catch(Exception ignored){}
        Calendar cal=Calendar.getInstance();cal.setTimeInMillis(from);
        int day=cal.get(Calendar.DAY_OF_WEEK);
        try(Cursor c=getReadableDatabase().rawQuery("SELECT id,title,starttime,endtime FROM school WHERE weekday=? ORDER BY starttime",
                new String[]{String.valueOf(day)})) {
            while(c.moveToNext()){
                try {
                    String[] parts=c.getString(2).split(":");
                    Calendar at=Calendar.getInstance();at.setTimeInMillis(from);
                    at.set(Calendar.HOUR_OF_DAY,Integer.parseInt(parts[0]));
                    at.set(Calendar.MINUTE,Integer.parseInt(parts[1]));
                    JSONObject o=new JSONObject();o.put("title","Scuola: "+c.getString(1)+" ("+c.getString(2)+"–"+c.getString(3)+")");
                    o.put("when",at.getTimeInMillis());o.put("kind","Scuola");o.put("id",0);arr.put(o);
                }catch(Exception ignored){}
            }
        }catch(Exception ignored){}
        return arr;
    }
    private JSONArray overdueTasks(long today) {
        JSONArray arr=new JSONArray();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT id,title,due,kind FROM tasks WHERE done=0 AND due<? ORDER BY due DESC LIMIT 30",
                new String[]{String.valueOf(today)})) {
            while(c.moveToNext()){
                JSONObject o=new JSONObject();o.put("id",c.getLong(0));o.put("title",c.getString(1));
                o.put("when",c.getLong(2));o.put("kind",c.getString(3));arr.put(o);
            }
        }catch(Exception ignored){}
        return arr;
    }
    private JSONArray recentMails() {
        JSONArray arr=new JSONArray();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT id,sender,subject,preview,received FROM mails ORDER BY received DESC LIMIT 30",null)) {
            while(c.moveToNext()){
                JSONObject o=new JSONObject();o.put("id",c.getLong(0));o.put("sender",c.getString(1));
                o.put("subject",c.getString(2));o.put("preview",c.getString(3));o.put("received",c.getLong(4));
                arr.put(o);
            }
        }catch(Exception ignored){}
        return arr;
    }
    private JSONArray allSchool() {
        JSONArray arr=new JSONArray();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT id,weekday,title,starttime,endtime FROM school ORDER BY weekday,starttime",null)) {
            while(c.moveToNext()){
                JSONObject o=new JSONObject();o.put("id",c.getLong(0));o.put("weekday",c.getInt(1));
                o.put("title",c.getString(2));o.put("start",c.getString(3));o.put("end",c.getString(4));arr.put(o);
            }
        }catch(Exception ignored){}
        return arr;
    }
    public void scheduleOutstanding(Context ctx) {
        try(Cursor c=getReadableDatabase().rawQuery("SELECT id,due FROM tasks WHERE done=0 AND due>? LIMIT 150",
                new String[]{String.valueOf(System.currentTimeMillis())})){
            while(c.moveToNext())Scheduler.scheduleTask(ctx,c.getLong(0),c.getLong(1));
        }catch(Exception ignored){}
    }
}