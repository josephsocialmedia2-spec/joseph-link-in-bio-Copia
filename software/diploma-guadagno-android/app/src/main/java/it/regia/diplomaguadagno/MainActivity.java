package it.regia.diplomaguadagno;
import android.Manifest;
import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import android.provider.AlarmClock;
import android.media.*;
import android.graphics.Color;
import android.view.*;
import android.widget.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
public class MainActivity extends Activity {
 static final String URL="https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/diploma-guadagno/";
 static final String CHANNEL="regia_v1";
 static final int ALL=127, SCHOOL=31, WORK=63, SAT=32, SUN=64;
 static final ZoneId ZONE=ZoneId.of("Europe/Rome");
 static final LocalDate END=LocalDate.of(2027,6,30);
 static final class Slot { final int h,m,days; final String title,detail; Slot(int h,int m,int d,String t,String s){this.h=h;this.m=m;days=d;title=t;detail=s;} String time(){return String.format(java.util.Locale.ITALY,"%02d:%02d",h,m);} }
 static final Slot[] S={
 new Slot(6,25,ALL,"Sveglia","Alzati e preparati."),
 new Slot(6,35,ALL,"Studio OCME","40 minuti per il diploma."),
 new Slot(7,15,ALL,"Fine studio","Registra il risultato."),
 new Slot(8,0,ALL,"Inizio lavoro","Lead e richiami autorizzati."),
 new Slot(9,0,ALL,"Articoli, email e lettere","Apri il centro testi."),
 new Slot(10,30,ALL,"Pubblicazioni e farming","Controlla contenuti e QR."),
 new Slot(12,0,WORK,"Pausa pranzo","Pranzo e riposo."),
 new Slot(12,45,WORK,"Ripasso spaziato","15 minuti di richiamo."),
 new Slot(13,0,WORK,"Contatti e follow-up","Risposte e richiami."),
 new Slot(14,45,WORK,"Controllo risultati","Aggiorna KPI e CRM."),
 new Slot(15,45,SCHOOL,"Stop lavoro","Vai in stazione."),
 new Slot(16,5,SCHOOL,"Treno imminente","Mancano dieci minuti."),
 new Slot(16,15,SCHOOL,"Partenza treno","Treno per scuola."),
 new Slot(17,0,SCHOOL,"Inizio scuola","Controlla le lezioni."),
 new Slot(21,25,SCHOOL,"Fine scuola","Rientro e cena."),
 new Slot(22,30,ALL,"Preparati per il riposo","Prepara il materiale."),
 new Slot(22,45,ALL,"Ora di dormire","Proteggi il sonno."),
 new Slot(16,0,SAT,"Sabato: fine lavoro","Pausa prima dello studio."),
 new Slot(17,0,SAT,"Sabato: recupero","40 minuti di studio."),
 new Slot(12,0,SUN,"Domenica: fine lavoro","Pranzo e riposo."),
 new Slot(13,30,SUN,"Domenica: pianificazione","Aggiorna orario e ripassi."),
 new Slot(14,30,SUN,"Domenica: recupero","40 minuti di studio.")};
 static boolean enabled(Context c){return c.getSharedPreferences("regia",0).getBoolean("enabled",false);}
 static boolean exact(Context c){return Build.VERSION.SDK_INT<31||c.getSystemService(AlarmManager.class).canScheduleExactAlarms();}
 static boolean notifications(Context c){return c.getSystemService(NotificationManager.class).areNotificationsEnabled()&&(Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED);}
 static PendingIntent pending(Context c,int i){Intent in=new Intent(c,AlarmReceiver.class).putExtra("slot",i);return PendingIntent.getBroadcast(c,i,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 static ZonedDateTime next(int i,ZonedDateTime now){Slot s=S[i];for(int d=0;d<=7;d++){LocalDate date=now.toLocalDate().plusDays(d);if(date.isAfter(END))return null;if((s.days&(1<<(date.getDayOfWeek().getValue()-1)))==0)continue;ZonedDateTime at=date.atTime(s.h,s.m).atZone(ZONE);if(at.isAfter(now))return at;}return null;}
 static void plan(Context c,int i){AlarmManager a=c.getSystemService(AlarmManager.class);PendingIntent p=pending(c,i);a.cancel(p);if(!enabled(c))return;ZonedDateTime n=next(i,ZonedDateTime.now(ZONE));if(n==null)return;long ms=n.toInstant().toEpochMilli();try{if(exact(c))a.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,ms,p);else a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,ms,p);}catch(SecurityException e){a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,ms,p);}}
 static void planAll(Context c){for(int i=0;i<S.length;i++)plan(c,i);}
 static void channel(Context c){NotificationChannel ch=new NotificationChannel(CHANNEL,"Cadenze Diploma e Guadagno",NotificationManager.IMPORTANCE_HIGH);ch.setDescription("Avvisi giornalieri con suono e vibrazione");ch.enableVibration(true);Uri sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);if(sound==null)sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);ch.setSound(sound,new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());c.getSystemService(NotificationManager.class).createNotificationChannel(ch);}
 static void notifySlot(Context c,int i){channel(c);if(!notifications(c))return;String t=i<0?"Prova avviso":S[i].title;String d=i<0?"Il sistema di notifiche e attivo.":S[i].detail;Intent open=new Intent(Intent.ACTION_VIEW,Uri.parse(URL));PendingIntent pi=PendingIntent.getActivity(c,500+i,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);Notification n=new Notification.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(t).setContentText(d).setStyle(new Notification.BigTextStyle().bigText(d)).setContentIntent(pi).setAutoCancel(true).setCategory(Notification.CATEGORY_ALARM).build();c.getSystemService(NotificationManager.class).notify(100+i,n);}
 public static class AlarmReceiver extends BroadcastReceiver {public void onReceive(Context c,Intent in){int i=in.getIntExtra("slot",-1);if(i<0||i>=S.length||!enabled(c))return;plan(c,i);if(!LocalDate.now(ZONE).isAfter(END))notifySlot(c,i);}}
 public static class RestoreReceiver extends BroadcastReceiver {public void onReceive(Context c,Intent in){planAll(c);}}
 LinearLayout root; TextView state; boolean requested=false;
 void text(String x,int size){TextView v=new TextView(this);v.setText(x);v.setTextSize(size);v.setPadding(12,10,12,10);root.addView(v);}
 void button(String x,Runnable run){Button b=new Button(this);b.setText(x);b.setAllCaps(false);root.addView(b);b.setOnClickListener(v->run.run());}
 void nativeAlarm(int h,int m,String msg,boolean all){try{ArrayList<Integer> days=new ArrayList<>();for(int i=CalendarStart(all);i<=6;i++)days.add(i);if(all)days.add(7);Intent x=new Intent(AlarmClock.ACTION_SET_ALARM).putExtra(AlarmClock.EXTRA_HOUR,h).putExtra(AlarmClock.EXTRA_MINUTES,m).putExtra(AlarmClock.EXTRA_MESSAGE,msg).putIntegerArrayListExtra(AlarmClock.EXTRA_DAYS,days).putExtra(AlarmClock.EXTRA_SKIP_UI,false);startActivity(x);}catch(ActivityNotFoundException e){Toast.makeText(this,"Apri manualmente l'app Orologio.",Toast.LENGTH_LONG).show();}}
 int CalendarStart(boolean all){return all?1:2;}
 void refresh(){if(state==null)return;state.setText((enabled(this)?"AVVISI ATTIVATI":"AVVISI DISATTIVATI")+"\nNotifiche: "+(notifications(this)?"OK":"permesso necessario")+"\nOrari precisi: "+(exact(this)?"OK":"permesso necessario; possibili ritardi"));}
 @Override public void onCreate(Bundle b){super.onCreate(b);channel(this);ScrollView scroll=new ScrollView(this);root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(20,40,20,40);scroll.setFillViewport(true);scroll.addView(root);setContentView(scroll);text("DIPLOMA & GUADAGNO",24);text("22 cadenze • fino al 30 giugno 2027 • orario italiano",15);state=new TextView(this);state.setPadding(12,12,12,12);state.setTextSize(17);root.addView(state);button("1. Consenti notifiche",()->{if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},10);else startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()));});button("2. Consenti sveglie precise",()->{if(Build.VERSION.SDK_INT>=31&&!exact(this))startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));else Toast.makeText(this,"Permesso gia attivo",Toast.LENGTH_SHORT).show();});button("3. Attiva tutte le cadenze",()->{getSharedPreferences("regia",0).edit().putBoolean("enabled",true).apply();planAll(this);refresh();});button("Disattiva tutte le cadenze",()->{getSharedPreferences("regia",0).edit().putBoolean("enabled",false).apply();planAll(this);refresh();});button("Prova suono e notifica",()->notifySlot(this,-1));button("Imposta sveglia vera 06:25 nell'Orologio",()->nativeAlarm(6,25,"Sveglia Diploma e Guadagno",true));button("Imposta sveglia vera 16:05 lun-ven",()->nativeAlarm(16,5,"Treno alle 16:15",false));button("Apri dashboard",()->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(URL))));text("Agenda delle cadenze",20);for(Slot s:S)text(s.time()+" · "+s.title+" · "+(s.days==ALL?"Tutti i giorni":s.days==SCHOOL?"Lun–Ven":s.days==WORK?"Lun–Sab":s.days==SAT?"Sab":"Dom"),15);text("Gli avvisi sonori dipendono dai permessi, dal volume, da Non disturbare e dalle restrizioni del dispositivo. Usa l’Orologio per il risveglio. Nessuna sincronizzazione automatica delle modifiche al calendario. Disattiva i doppioni Google Calendar se necessario.",14);refresh();}
 @Override protected void onResume(){super.onResume();refresh();if(enabled(this))planAll(this);}
 @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);refresh();}
}
