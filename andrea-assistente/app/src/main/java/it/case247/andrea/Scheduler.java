package it.case247.andrea;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.Calendar;

public final class Scheduler {
    private static PendingIntent pending(Context ctx,int requestCode,String type,long id){
        Intent i=new Intent(ctx,ReminderReceiver.class);
        i.putExtra("type",type);
        i.putExtra("taskId",id);
        return PendingIntent.getBroadcast(ctx,requestCode,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    private static void set(Context ctx,long when,PendingIntent pi) {
        AlarmManager alarm=(AlarmManager)ctx.getSystemService(Context.ALARM_SERVICE);
        if(alarm==null)return;
        try{
            if(Build.VERSION.SDK_INT<31 || alarm.canScheduleExactAlarms())
                alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
            else alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
        }catch(SecurityException e){
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
        }
    }
    private static void scheduleDailyOne(Context ctx,String name,int code,int hour,int minute){
        Calendar c=Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY,hour);c.set(Calendar.MINUTE,minute);
        c.set(Calendar.SECOND,0);c.set(Calendar.MILLISECOND,0);
        if(c.getTimeInMillis()<=System.currentTimeMillis()+1000)c.add(Calendar.DAY_OF_MONTH,1);
        set(ctx,c.getTimeInMillis(),pending(ctx,code,name,0));
    }
    public static void scheduleDaily(Context ctx){
        android.content.SharedPreferences p=ctx.getSharedPreferences("andrea",Context.MODE_PRIVATE);
        scheduleDailyOne(ctx,"morning",21,p.getInt("morningHour",8),p.getInt("morningMinute",0));
        scheduleDailyOne(ctx,"evening",22,p.getInt("eveningHour",20),p.getInt("eveningMinute",30));
    }
    public static void scheduleTask(Context ctx,long id,long due){
        if(due<=System.currentTimeMillis())return;
        set(ctx,due,pending(ctx,1000+(int)(id%1000000),"task",id));
    }
    public static void cancelTask(Context ctx,long id){
        AlarmManager alarm=(AlarmManager)ctx.getSystemService(Context.ALARM_SERVICE);
        if(alarm!=null)alarm.cancel(pending(ctx,1000+(int)(id%1000000),"task",id));
    }
}
