Attribute VB_Name = "CASE247FarmingPESA"
Option Explicit

' CASE247 - GENERATORE FARMING DI ZONA + PESA
' Lancia InstallaAcquisizioneCASE247 da un file .xlsm.
' Genera un NUOVO file Excel .xlsx con esattamente due fogli:
' Acquisizione (solo risultati raggiunti) e PESA (peso/IMC).
' Non modifica i file esistenti, non acquisisce dati dal browser e non
' contiene dati personali, numeri di contatto o misurazioni predefinite.

Public Sub InstallaAcquisizioneCASE247()
    Dim w As Workbook, zona As Worksheet, pesa As Worksheet
    Dim firstDay As Date, lastDay As Date, n As Long, r As Long
    Dim dates() As Variant, altezza As Variant, peso As Variant, target As Variant
    On Error GoTo ErrHandler
    Application.ScreenUpdating = False
    Set w = Workbooks.Add(xlWBATWorksheet)
    Set zona = w.Worksheets(1): zona.Name = "Acquisizione"
    Set pesa = w.Worksheets.Add(After:=zona): pesa.Name = "PESA"
    ImpostaFarming zona
    firstDay = Date
    lastDay = DateAdd("yyyy", 1, firstDay)
    n = DateDiff("d", firstDay, lastDay) + 1
    ReDim dates(1 To n, 1 To 1)
    For r = 1 To n
        dates(r, 1) = DateAdd("d", r - 1, firstDay)
    Next r
    ImpostaPESA pesa, dates, n
    Application.ScreenUpdating = True
    altezza = Application.InputBox("Indica l'altezza in centimetri, oppure Annulla per lasciarla vuota.", "PESA - altezza", Type:=1)
    If VarType(altezza) <> vbBoolean Then
        If IsNumeric(altezza) Then
            If CDbl(altezza) > 0 Then pesa.Range("B6").Value = CDbl(altezza)
        End If
    End If
    peso = Application.InputBox("Indica il primo peso in kg, oppure Annulla per lasciarlo vuoto.", "PESA - peso", Type:=1)
    If VarType(peso) <> vbBoolean Then
        If IsNumeric(peso) Then
            If CDbl(peso) > 0 Then pesa.Range("B8").Value = CDbl(peso)
        End If
    End If
    zona.Activate
    target = Application.GetSaveAsFilename("CASE247_Farming_PESA_2_Schede.xlsx", "Cartella Excel (*.xlsx),*.xlsx")
    If VarType(target) = vbBoolean Then
        MsgBox "Creato il file a due fogli. Salvalo manualmente come .xlsx.", vbInformation
    Else
        w.SaveAs Filename:=CStr(target), FileFormat:=xlOpenXMLWorkbook
        MsgBox "Creato e salvato il file con esattamente due schede.", vbInformation
    End If
    Exit Sub
ErrHandler:
    Application.ScreenUpdating = True
    MsgBox "Impossibile creare il file: " & Err.Description, vbExclamation
End Sub

Private Sub ImpostaFarming(ByVal ws As Worksheet)
    Dim heads As Variant, i As Long, k As Long
    heads = Array("Data risultato", "Comune", "Zona / microzona", "Via e civico", _
        "Cliente / immobile (riferimento)", "Volantini consegnati", _
        "Lettere consegnate", "Notizie verificate", "Risposte ricevute", _
        "Incontri svolti", "Risultato concreto raggiunto", "Fonte / note verificabili")
    ws.Cells.Font.Name = "Aptos"
    ws.Range("A1:F2").Merge: ws.Range("A1").Value = "JOSEPH MALAFRONTE | FARMING DI ZONA"
    ws.Range("G1:L2").Merge: ws.Range("G1").Value = "RISULTATI CONCRETI - CLIENTE PER RIGA"
    ws.Range("A1:L2").Interior.Color = RGB(28, 35, 43)
    ws.Range("A1:L2").Font.Color = vbWhite
    ws.Range("A1:L2").Font.Bold = True
    ws.Range("A1:L2").Font.Size = 16
    ws.Range("A1:L2").VerticalAlignment = xlCenter
    ws.Rows("1:2").RowHeight = 24
    ws.Range("A3:L4").Merge
    ws.Range("A3").Value = "Una sola riga per cliente / immobile. Registra esclusivamente lavori conclusi e risultati verificabili: niente attivita' pianificate."
    ws.Range("A3:L4").Interior.Color = RGB(250, 243, 229)
    ws.Range("A3:L4").WrapText = True
    ws.Rows("3:4").RowHeight = 23
    ws.Range("A5:L5").Merge
    ws.Range("A5").Value = "I dati restano nel file locale; non caricare dati personali nel repository pubblico."
    For i = 0 To 11
        ws.Cells(7, i + 1).Value = heads(i)
    Next i
    With ws.Range("A7:L7")
        .Interior.Color = RGB(28, 35, 43)
        .Font.Color = vbWhite
        .Font.Bold = True
        .RowHeight = 42
        .WrapText = True
        .VerticalAlignment = xlCenter
    End With
    ws.Columns("A").ColumnWidth = 16
    ws.Columns("B").ColumnWidth = 20
    ws.Columns("C").ColumnWidth = 26
    ws.Columns("D").ColumnWidth = 25
    ws.Columns("E").ColumnWidth = 31
    ws.Columns("F:J").ColumnWidth = 19
    ws.Columns("K:L").ColumnWidth = 38
    ws.Columns("M").ColumnWidth = 3
    ws.Columns("N").ColumnWidth = 29
    ws.Columns("O").ColumnWidth = 18
    ws.Range("A8:A1007").NumberFormat = "dd/mm/yyyy"
    ws.Range("F8:J1007").NumberFormat = "0"
    ws.Range("A7:L1007").AutoFilter
    With ws.Range("F8:J1007").Validation
        .Delete
        .Add Type:=xlValidateWholeNumber, AlertStyle:=xlValidAlertStop, _
            Operator:=xlBetween, Formula1:="0", Formula2:="100000"
        .IgnoreBlank = True
    End With
    ws.Range("N2:O2").Merge
    ws.Range("N2").Value = "RISULTATI REALIZZATI"
    ws.Range("N2:O2").Interior.Color = RGB(28, 35, 43)
    ws.Range("N2:O2").Font.Color = vbWhite
    ws.Range("N2:O2").Font.Bold = True
    ws.Range("N4:N9").Value = Application.Transpose(Array( _
        "Schede cliente / immobile", "Volantini consegnati", _
        "Lettere consegnate", "Notizie verificate", _
        "Risposte ricevute", "Incontri svolti"))
    ws.Range("O4").Formula = "=COUNTIF(D8:D1007,""?*"")"
    For k = 5 To 9
        ws.Cells(k, "O").Formula = "=SUM(" & Chr$(Asc("F") + k - 5) & "8:" & Chr$(Asc("F") + k - 5) & "1007)"
    Next k
    ws.Range("O4:O9").Interior.Color = RGB(250, 243, 229)
    ws.Range("O4:O9").Font.Bold = True
    ws.Range("O4:O9").HorizontalAlignment = xlCenter
    ws.Activate: ws.Range("A8").Select: ActiveWindow.FreezePanes = True
End Sub

Private Sub ImpostaPESA(ByVal ws As Worksheet, ByRef dates As Variant, ByVal n As Long)
    Dim lastRow As Long, ch As ChartObject
    lastRow = 7 + n
    ws.Cells.Font.Name = "Aptos"
    ws.Range("A1:K2").Merge
    ws.Range("A1").Value = "REGISTRO PESA | PESO E IMC ANNUALE"
    With ws.Range("A1:K2")
        .Interior.Color = RGB(28, 35, 43)
        .Font.Color = vbWhite
        .Font.Size = 18
        .Font.Bold = True
        .VerticalAlignment = xlCenter
    End With
    ws.Rows("1:2").RowHeight = 25
    ws.Range("A3:B4").Merge
    ws.Range("A3").Value = "Una riga al giorno. Inserire solo i pesi effettivamente misurati."
    ws.Range("A3:B4").Interior.Color = RGB(250, 243, 229)
    ws.Range("A3:B4").WrapText = True
    ws.Range("A6").Value = "Altezza (cm)"
    ws.Range("A6").Font.Bold = True
    ws.Range("B6").Interior.Color = RGB(250, 243, 229)
    ws.Range("A7:B7").Value = Array("Data", "Peso (kg)")
    ws.Range("A7:B7").Interior.Color = RGB(28, 35, 43)
    ws.Range("A7:B7").Font.Color = vbWhite
    ws.Range("A7:B7").Font.Bold = True
    ws.Range("A8").Resize(n, 1).Value = dates
    ws.Range("A8:A" & lastRow).NumberFormat = "dd/mm/yyyy"
    ws.Range("B8:B" & lastRow).NumberFormat = "0.00"
    ws.Range("B8:B" & lastRow).Interior.Color = RGB(250, 243, 229)
    ws.Columns("A:B").ColumnWidth = 18
    ws.Columns("C").ColumnWidth = 3
    ws.Columns("D:K").ColumnWidth = 16
    ws.Range("D3:K3").Merge
    ws.Range("D3").Value = "INDICE DI MASSA CORPOREA E CLASSIFICAZIONE"
    ws.Range("D3:K3").Interior.Color = RGB(28, 35, 43)
    ws.Range("D3:K3").Font.Color = vbWhite
    ws.Range("D3:K3").Font.Bold = True
    ws.Range("D4:F4").Merge: ws.Range("D4").Value = "Ultimo peso registrato (kg)"
    ws.Range("D5:F5").Merge: ws.Range("D5").Value = "IMC / BMI"
    ws.Range("D6:F6").Merge: ws.Range("D6").Value = "Classificazione"
    ws.Range("D7:F7").Merge: ws.Range("D7").Value = "Variazione dal primo peso"
    ws.Range("D8:F8").Merge: ws.Range("D8").Value = "Misurazioni registrate"
    ws.Range("G4:K4").Merge
    ws.Range("G5:K5").Merge
    ws.Range("G6:K6").Merge
    ws.Range("G7:K7").Merge
    ws.Range("G8:K8").Merge
    ws.Range("G4:K8").Interior.Color = RGB(250, 243, 229)
    ws.Range("G4:K8").Font.Bold = True
    ws.Range("G4").Formula = "=IF(COUNT(B8:B" & lastRow & ")=0,"""",IF(COUNT(B8:B" & lastRow & ")=1,B8,LOOKUP(2,1/(ISNUMBER(B8:B" & lastRow & ")),B8:B" & lastRow & ")))"
    ws.Range("G5").Formula = "=IF(OR(G4="""",$B$6=""""),"""",ROUND(G4/($B$6/100)^2,1))"
    ws.Range("G6").Formula = "=IF(OR(G4="""",$B$6=""""),"""",IF(G4/($B$6/100)^2<18.5,""Sottopeso"",IF(G4/($B$6/100)^2<25,""Normopeso"",IF(G4/($B$6/100)^2<30,""Sovrappeso"",IF(G4/($B$6/100)^2<35,""Obesita' I grado"",IF(G4/($B$6/100)^2<40,""Obesita' II grado"",""Obesita' III grado""))))))"
    ws.Range("G7").Formula = "=IF(OR(G4="""",B8=""""),"""",G4-B8)"
    ws.Range("G8").Formula = "=COUNT(B8:B" & lastRow & ")"
    ws.Range("G4").NumberFormat = "0.00"
    ws.Range("G5").NumberFormat = "0.0"
    ws.Range("G7").NumberFormat = "+0.00;-0.00;0.00"
    ws.Range("D10:K10").Merge
    ws.Range("D10").Value = "IMC = kg / altezza(m)^2. Categorie per adulti: <18,5; 18,5-24,9; 25-29,9; 30-34,9; 35-39,9; >=40."
    ws.Range("D11:K11").Merge
    ws.Range("D11").Value = "https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html"
    ws.Range("D10:K11").Font.Color = RGB(101, 115, 131)
    Set ch = ws.ChartObjects.Add(ws.Range("D13").Left, ws.Range("D13").Top, 780, 350)
    With ch.Chart
        .ChartType = xlLine
        .SeriesCollection.NewSeries
        .SeriesCollection(1).Name = "Peso (kg)"
        .SeriesCollection(1).XValues = ws.Range("A8:A" & lastRow)
        .SeriesCollection(1).Values = ws.Range("B8:B" & lastRow)
        .DisplayBlanksAs = xlNotPlotted
        .HasTitle = True
        .ChartTitle.Text = "Andamento del peso"
        .HasLegend = False
    End With
    ws.Activate: ws.Range("A8").Select: ActiveWindow.FreezePanes = True
End Sub
