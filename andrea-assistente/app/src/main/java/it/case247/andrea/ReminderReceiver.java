package it.case247.andrea;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.database.Cursor;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class ReminderReceiver extends BroadcastReceiver {
    public static final String CHANNEL="andrea_agenda";
    public static void channel(Context ctx){
        NotificationManager nm=(NotificationManager)ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if(nm!=null && Build.VERSION.SDK_INT>=26)
            nm.createNotificationChannel(new NotificationChannel(CHANNEL,"Agenda e promemoria Andrea",NotificationManager.IMPORTANCE_HIGH));
    }
    @Override public void onReceive(Context ctx,Intent intent){
        String type=intent==null?"":intent.getStringExtra("type");
        if(type==null)type="";
        try{
            if("morning".equals(type)||"evening".equals(type)){
                boolean evening="evening".equals(type);
                JSONArray a=new AgendaStore(ctx).snapshot(ctx).optJSONArray(evening?"tomorrow":"today");
                int n=a==null?0:a.length();
                StringBuilder sb=new StringBuilder();
                SimpleDateFormat f=new SimpleDateFormat("HH:mm",Locale.ITALY);
                if(a!=null)for(int j=0;j<Math.min(n,8);j++){
                    JSONObject o=a.optJSONObject(j);
                    if(o==null)continue;
                    sb.append(f.format(new Date(o.optLong("when")))).append("  ")
                      .append(o.optString("title")).append("\n");
                }
                if(n>8)sb.append("...e altri ").append(n-8).append(" impegni.");
                String title=evening?"Andrea · Programma di domani":"Andrea · Agenda di oggi";
                String msg=n==0?"Nessun appuntamento o attività registrata. Controlla anche le email scuola.":sb.toString().trim();
                show(ctx,evening?22:21,title,msg);
            }else if("task".equals(type)){
                long id=intent.getLongExtra("taskId",-1);
                try(Cursor c=new AgendaStore(ctx).getReadableDatabase().rawQuery(
                        "SELECT title FROM tasks WHERE id=? AND done=0",new String[]{String.valueOf(id)})){
                    if(c.moveToFirst())show(ctx,1000+(int)(id%1000000),"Andrea · Attività da svolgere",c.getString(0));
                }
            }
        }catch(Exception ignored){}
        if(!"task".equals(type)) Scheduler.scheduleDaily(ctx);
    }
    private static void show(Context ctx,int id,String title,String body){
        channel(ctx);
        if(Build.VERSION.SDK_INT>=33 && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
        NotificationManager nm=(NotificationManager)ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if(nm==null)return;
        PendingIntent open=PendingIntent.getActivity(ctx,0,new Intent(ctx,MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification n=new Notification.Builder(ctx,CHANNEL)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle(title)
                .setContentText(body.length()>80?body.substring(0,80):body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true).setContentIntent(open).build();
        nm.notify(id,n);
    }
}
