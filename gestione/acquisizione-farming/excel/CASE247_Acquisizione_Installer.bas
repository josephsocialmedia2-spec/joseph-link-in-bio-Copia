Attribute VB_Name = "CASE247FarmingPESA"
Option Explicit

' INSTALLAZIONE:
' 1. Apri il file Excel FARMING + PESA e salvalo come .xlsm.
' 2. Alt+F11 > File > Importa file: questo modulo .bas.
' 3. Alt+F8 > InstallaAcquisizioneCASE247 (una sola volta).
' 4. Nella pagina Farming scarica "Risultati raggiunti CSV".
' 5. Alt+F8 > AggiornaRisultatiFarmingDaCSV quando necessario.
'
' Esattamente due schede; mai cancellare i fogli o i risultati esistenti.
' Nessun numero di telefono nel modello. Tutti i dati restano nel computer.

Private Const FIRST_DATA_ROW As Long = 8
Private Const LAST_DATA_ROW As Long = 1007
Private Const SRC_COLS As Long = 12

Public Sub InstallaAcquisizioneCASE247()
    Dim wb As Workbook, farming As Worksheet, pesa As Worksheet
    On Error GoTo Failure
    Set wb = ThisWorkbook
    If wb.ProtectStructure Then
        MsgBox "La struttura del file e' protetta. Nessuna modifica effettuata.", vbExclamation
        Exit Sub
    End If
    If wb.Worksheets.Count > 2 Then
        MsgBox "Apri una cartella con Acquisizione e PESA, oppure una cartella nuova con un solo foglio. Non cancello altri fogli.", vbExclamation
        Exit Sub
    End If
    Application.ScreenUpdating = False
    If wb.Worksheets.Count = 1 Then
        Set farming = wb.Worksheets(1)
        If Application.WorksheetFunction.CountA(farming.UsedRange) > 0 Then
            Application.ScreenUpdating = True
            MsgBox "Il foglio unico contiene gia' dati. Non lo sovrascrivo: usa un file vuoto.", vbExclamation
            Exit Sub
        End If
        farming.Name = "Acquisizione"
        Set pesa = wb.Worksheets.Add(After:=farming)
        pesa.Name = "PESA"
    Else
        If Not HasSheet(wb, "Acquisizione") Or Not HasSheet(wb, "PESA") Then
            Application.ScreenUpdating = True
            MsgBox "Per proteggere i tuoi dati non rinomino fogli esistenti. Servono solo Acquisizione e PESA.", vbExclamation
            Exit Sub
        End If
        Set farming = wb.Worksheets("Acquisizione")
        Set pesa = wb.Worksheets("PESA")
    End If

    If Len(Trim$(CStr(farming.Range("A7").Value))) = 0 Then
        BuildFarming farming
    ElseIf CStr(farming.Range("A7").Value) <> "Data risultato" _
        Or CStr(farming.Range("D7").Value) <> "Via e civico" Then
        Application.ScreenUpdating = True
        MsgBox "Lo schema del foglio Acquisizione non corrisponde al modello: nessuna modifica.", vbExclamation
        Exit Sub
    End If

    If Len(Trim$(CStr(pesa.Range("A7").Value))) = 0 Then
        BuildPESA pesa
    ElseIf CStr(pesa.Range("A7").Value) <> "Data" _
        Or CStr(pesa.Range("B7").Value) <> "Peso (kg)" Then
        Application.ScreenUpdating = True
        MsgBox "Lo schema del foglio PESA non corrisponde al modello: nessuna modifica.", vbExclamation
        Exit Sub
    End If

    AddRefreshButton farming
    Application.ScreenUpdating = True
    MsgBox "Farming + PESA pronti: due soli fogli. Ora puoi importare i risultati verificati dal CSV.", vbInformation
    Exit Sub
Failure:
    Application.ScreenUpdating = True
    MsgBox "Installazione non completata: " & Err.Description, vbExclamation
End Sub

Private Sub BuildFarming(ByVal ws As Worksheet)
    Dim headings As Variant, i As Long
    headings = Array("Data risultato", "Comune", "Zona / microzona", "Via e civico", _
        "Cliente / immobile (riferimento)", "Volantini consegnati", _
        "Lettere consegnate", "Notizie verificate", "Risposte ricevute", _
        "Incontri svolti", "Risultato concreto raggiunto", "Fonte / note verificabili")
    ws.Cells.Font.Name = "Aptos"
    ws.Range("A1:L2").Merge
    ws.Range("A1").Value = "JOSEPH MALAFRONTE | FARMING DI ZONA · RISULTATI RAGGIUNTI"
    With ws.Range("A1:L2")
        .Interior.Color = RGB(28, 35, 43)
        .Font.Color = vbWhite
        .Font.Bold = True
        .Font.Size = 16
        .VerticalAlignment = xlCenter
    End With
    ws.Range("A3:L4").Merge
    ws.Range("A3").Value = "Una riga per cliente/immobile. Solo risultati concluse e verificabili; nessuna rubrica telefonica."
    ws.Range("A3:L4").WrapText = True
    ws.Range("A3:L4").Interior.Color = RGB(250, 243, 229)
    For i = 0 To 11
        ws.Cells(7, i + 1).Value = headings(i)
    Next i
    With ws.Range("A7:L7")
        .Interior.Color = RGB(28, 35, 43)
        .Font.Color = vbWhite
        .Font.Bold = True
        .WrapText = True
        .RowHeight = 40
    End With
    ws.Columns("A").ColumnWidth = 17
    ws.Columns("B").ColumnWidth = 21
    ws.Columns("C").ColumnWidth = 26
    ws.Columns("D").ColumnWidth = 27
    ws.Columns("E").ColumnWidth = 30
    ws.Columns("F:J").ColumnWidth = 19
    ws.Columns("K:L").ColumnWidth = 39
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
    ws.Range("N4").Value = "Schede cliente / immobile"
    ws.Range("N5").Value = "Volantini consegnati"
    ws.Range("N6").Value = "Lettere consegnate"
    ws.Range("N7").Value = "Notizie verificate"
    ws.Range("N8").Value = "Risposte ricevute"
    ws.Range("N9").Value = "Incontri svolti"
    ws.Range("O4").Formula = "=COUNTIF(D8:D1007,""?*"")"
    ws.Range("O5").Formula = "=SUM(F8:F1007)"
    ws.Range("O6").Formula = "=SUM(G8:G1007)"
    ws.Range("O7").Formula = "=SUM(H8:H1007)"
    ws.Range("O8").Formula = "=SUM(I8:I1007)"
    ws.Range("O9").Formula = "=SUM(J8:J1007)"
    ws.Range("O4:O9").Interior.Color = RGB(250, 243, 229)
    ws.Range("O4:O9").Font.Bold = True
    ws.Activate: ws.Range("A8").Select
    ActiveWindow.FreezePanes = True
End Sub

Private Sub BuildPESA(ByVal ws As Worksheet)
    Dim start As Date, last As Date, n As Long, r As Long, endRow As Long
    Dim ch As ChartObject
    start = Date
    last = DateAdd("yyyy", 1, start)
    n = DateDiff("d", start, last) + 1
    endRow = 7 + n
    ws.Cells.Font.Name = "Aptos"
    ws.Range("A1:K2").Merge
    ws.Range("A1").Value = "REGISTRO PESA | PESO E IMC ANNUALE"
    ws.Range("A1:K2").Interior.Color = RGB(28, 35, 43)
    ws.Range("A1:K2").Font.Color = vbWhite
    ws.Range("A1:K2").Font.Bold = True
    ws.Range("A1:K2").Font.Size = 17
    ws.Range("A6").Value = "Altezza (cm)"
    ws.Range("A7").Value = "Data"
    ws.Range("B7").Value = "Peso (kg)"
    ws.Range("A7:B7").Interior.Color = RGB(28, 35, 43)
    ws.Range("A7:B7").Font.Color = vbWhite
    ws.Range("A7:B7").Font.Bold = True
    For r = 8 To endRow
        ws.Cells(r, "A").Value = DateAdd("d", r - 8, start)
    Next r
    ws.Range("A8:A" & endRow).NumberFormat = "dd/mm/yyyy"
    ws.Range("B8:B" & endRow).NumberFormat = "0.00"
    ws.Range("B6").Interior.Color = RGB(250, 243, 229)
    ws.Range("B8:B" & endRow).Interior.Color = RGB(250, 243, 229)
    ws.Columns("A:B").ColumnWidth = 18
    ws.Columns("C").ColumnWidth = 3
    ws.Columns("D:K").ColumnWidth = 16
    ws.Range("D3:K3").Merge: ws.Range("D3").Value = "INDICE DI MASSA CORPOREA E CLASSIFICAZIONE"
    ws.Range("D3:K3").Interior.Color = RGB(28, 35, 43)
    ws.Range("D3:K3").Font.Color = vbWhite
    ws.Range("D3:K3").Font.Bold = True
    ws.Range("D4").Value = "Ultimo peso (kg)"
    ws.Range("D5").Value = "IMC"
    ws.Range("D6").Value = "Classificazione"
    ws.Range("D7").Value = "Variazione peso"
    ws.Range("D8").Value = "Misurazioni"
    ws.Range("G4:K4").Merge
    ws.Range("G5:K5").Merge
    ws.Range("G6:K6").Merge
    ws.Range("G7:K7").Merge
    ws.Range("G8:K8").Merge
    ws.Range("G4:K8").Interior.Color = RGB(250, 243, 229)
    ws.Range("G4").Formula = "=IF(COUNT(B8:B" & endRow & ")=0,"""",LOOKUP(2,1/(ISNUMBER(B8:B" & endRow & ")),B8:B" & endRow & "))"
    ws.Range("G5").Formula = "=IF(OR(G4="""",$B$6=""""),"""",ROUND(G4/($B$6/100)^2,1))"
    ws.Range("G6").Formula = "=IF(OR(G4="""",$B$6=""""),"""",IF(G4/($B$6/100)^2<18.5,""Sottopeso"",IF(G4/($B$6/100)^2<25,""Normopeso"",IF(G4/($B$6/100)^2<30,""Sovrappeso"",IF(G4/($B$6/100)^2<35,""Obesita' I grado"",IF(G4/($B$6/100)^2<40,""Obesita' II grado"",""Obesita' III grado""))))))"
    ws.Range("G7").Formula = "=IF(OR(G4="""",COUNT(B8:B" & endRow & ")=0),"""",G4-INDEX(B8:B" & endRow & ",MATCH(TRUE,INDEX(ISNUMBER(B8:B" & endRow & "),0),0)))"
    ws.Range("G8").Formula = "=COUNT(B8:B" & endRow & ")"
    ws.Range("G4").NumberFormat = "0.00"
    ws.Range("G5").NumberFormat = "0.0"
    ws.Range("G7").NumberFormat = "+0.00;-0.00;0.00"
    ws.Range("D10").Value = "IMC = peso (kg) / altezza (m)^2"
    ws.Range("D11").Value = "https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html"
    Set ch = ws.ChartObjects.Add(ws.Range("D13").Left, ws.Range("D13").Top, 780, 350)
    With ch.Chart
        .ChartType = xlLine
        .SeriesCollection.NewSeries
        .SeriesCollection(1).Name = "Peso (kg)"
        .SeriesCollection(1).XValues = ws.Range("A8:A" & endRow)
        .SeriesCollection(1).Values = ws.Range("B8:B" & endRow)
        .DisplayBlanksAs = xlNotPlotted
        .HasTitle = True
        .ChartTitle.Text = "Andamento del peso"
        .HasLegend = False
    End With
    ws.Activate: ws.Range("A8").Select
    ActiveWindow.FreezePanes = True
    If MsgBox("Impostare ora altezza e prima pesata nel foglio PESA?", vbYesNo+vbQuestion) = vbYes Then
        Dim h As Variant, kg As Variant
        h = Application.InputBox("Altezza in cm:", "Altezza", Type:=1)
        If VarType(h) <> vbBoolean Then
            If IsNumeric(h) Then If CDbl(h) > 0 Then ws.Range("B6").Value = CDbl(h)
        End If
        kg = Application.InputBox("Peso iniziale in kg:", "Pesata", Type:=1)
        If VarType(kg) <> vbBoolean Then
            If IsNumeric(kg) Then If CDbl(kg) > 0 Then ws.Range("B8").Value = CDbl(kg)
        End If
    End If
End Sub

Private Sub AddRefreshButton(ByVal ws As Worksheet)
    Dim sh As Shape
    On Error Resume Next
    ws.Shapes("CASE247_Farming_Refresh").Delete
    On Error GoTo 0
    Set sh = ws.Shapes.AddShape(msoShapeRoundedRectangle, ws.Range("N13").Left, ws.Range("N13").Top, 245, 43)
    sh.Name = "CASE247_Farming_Refresh"
    sh.TextFrame2.TextRange.Text = "AGGIORNA RISULTATI FARMING"
    sh.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = vbWhite
    sh.Fill.ForeColor.RGB = RGB(168, 129, 50)
    sh.Line.Visible = msoFalse
    sh.OnAction = "AggiornaRisultatiFarmingDaCSV"
    ws.Hyperlinks.Add ws.Range("N18"), _
        "https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/acquisizione-farming/", , , _
        "Apri Laboratorio di zona"
End Sub

Public Sub AggiornaRisultatiFarmingDaCSV()
    Dim wb As Workbook, dest As Worksheet, srcWb As Workbook, src As Worksheet
    Dim picked As Variant, r As Long, n As Long, j As Long
    Dim idx As Long, imported As Long, refreshed As Long, ignored As Long
    Dim city As String, addr As String, ref As String, datestring As String
    Dim counts(1 To 5) As Long, positiveSum As Long
    Dim expected As Variant, col As Long
    On Error GoTo Failure
    Set wb = ThisWorkbook
    If wb.Worksheets.Count <> 2 Or Not HasSheet(wb, "Acquisizione") Or Not HasSheet(wb, "PESA") Then
        MsgBox "Installa prima le due schede Acquisizione + PESA.", vbExclamation
        Exit Sub
    End If
    Set dest = wb.Worksheets("Acquisizione")
    picked = Application.GetOpenFilename("CSV di farming (*.csv),*.csv", , "Seleziona il CSV di risultati raggiunti")
    If VarType(picked) = vbBoolean Then Exit Sub
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    ' Leggi TUTTE le colonne come TESTO: conserva date e non esegue formule da CSV.
    Workbooks.OpenText Filename:=CStr(picked), Origin:=65001, _
        DataType:=xlDelimited, Semicolon:=True, _
        TextQualifier:=xlTextQualifierDoubleQuote, _
        FieldInfo:=Array(Array(1, 2), Array(2, 2), Array(3, 2), _
        Array(4, 2), Array(5, 2), Array(6, 2), Array(7, 2), _
        Array(8, 2), Array(9, 2), Array(10, 2), Array(11, 2), Array(12, 2)), _
        Local:=True
    Set srcWb = ActiveWorkbook
    Set src = srcWb.Worksheets(1)
    expected = Array("Data risultato", "Comune", "Zona / microzona", "Via e civico", _
        "Cliente / immobile (riferimento)", "Volantini consegnati", _
        "Lettere consegnate", "Notizie verificate", "Risposte ricevute", _
        "Incontri svolti", "Risultato concreto raggiunto", "Fonte / note verificabili")
    For col = 1 To SRC_COLS
        If Trim$(CStr(src.Cells(1, col).Value)) <> CStr(expected(col - 1)) Then
            MsgBox "CSV non compatibile: intestazione colonna " & col & ".", vbExclamation
            GoTo CleanExit
        End If
    Next col

    n = src.Cells(src.Rows.Count, "D").End(xlUp).Row
    For r = 2 To n
        addr = SafeText(src.Cells(r, 4).Value)
        city = SafeText(src.Cells(r, 2).Value)
        ref = SafeText(src.Cells(r, 5).Value)
        datestring = Trim$(CStr(src.Cells(r, 1).Value))
        positiveSum = 0
        For j = 1 To 5
            counts(j) = SafeWhole(src.Cells(r, j + 5).Value)
            positiveSum = positiveSum + counts(j)
        Next j
        If Len(addr) = 0 Or Len(city) = 0 Or positiveSum = 0 _
            Or Not IsIsoDate(datestring) Then
            ignored = ignored + 1
        Else
            idx = FindAcquisitionRow(dest, city, addr, ref)
            If idx < FIRST_DATA_ROW Then
                idx = dest.Cells(dest.Rows.Count, "D").End(xlUp).Row + 1
                If idx < FIRST_DATA_ROW Then idx = FIRST_DATA_ROW
                If idx > LAST_DATA_ROW Then
                    MsgBox "Massimo " & LAST_DATA_ROW - FIRST_DATA_ROW + 1 & " schede cliente. Esportazione interrotta.", vbExclamation
                    Exit For
                End If
                imported = imported + 1
            Else
                refreshed = refreshed + 1
            End If
            ' SNAPSHOT: sostituisce i conteggi per la stessa scheda, non li somma due volte.
            dest.Cells(idx, 1).Value = IsoToDate(datestring)
            dest.Cells(idx, 2).Value = city
            dest.Cells(idx, 3).Value = SafeText(src.Cells(r, 3).Value)
            dest.Cells(idx, 4).Value = addr
            dest.Cells(idx, 5).Value = ref
            For j = 1 To 5
                dest.Cells(idx, j + 5).Value = counts(j)
            Next j
            dest.Cells(idx, 11).Value = SafeText(src.Cells(r, 11).Value)
            dest.Cells(idx, 12).Value = SafeText(src.Cells(r, 12).Value)
        End If
    Next r
    dest.Activate
    MsgBox "Aggiornamento locale completato: " & imported & " nuove schede, " _
      & refreshed & " aggiornate, " & ignored & " escluse. Nessun numero di telefono importato.", vbInformation

CleanExit:
    On Error Resume Next
    If Not srcWb Is Nothing Then srcWb.Close SaveChanges:=False
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    Exit Sub
Failure:
    MsgBox "Importazione interrotta: " & Err.Description, vbExclamation
    Resume CleanExit
End Sub

Private Function FindAcquisitionRow(ByVal ws As Worksheet, ByVal city As String, _
    ByVal addr As String, ByVal ref As String) As Long
    Dim r As Long, last As Long
    last = ws.Cells(ws.Rows.Count, "D").End(xlUp).Row
    If last < FIRST_DATA_ROW Then Exit Function
    For r = FIRST_DATA_ROW To last
        If StrComp(Trim$(CStr(ws.Cells(r, 2).Value)), city, vbTextCompare) = 0 _
          And StrComp(Trim$(CStr(ws.Cells(r, 4).Value)), addr, vbTextCompare) = 0 _
          And StrComp(Trim$(CStr(ws.Cells(r, 5).Value)), ref, vbTextCompare) = 0 Then
          FindAcquisitionRow = r
          Exit Function
        End If
    Next r
End Function

Private Function SafeWhole(ByVal v As Variant) As Long
    If Not IsNumeric(v) Then Exit Function
    If CDbl(v) < 0 Or CDbl(v) > 100000 Then Exit Function
    SafeWhole = CLng(Fix(CDbl(v)))
End Function

Private Function SafeText(ByVal v As Variant) As String
    Dim s As String, rx As Object
    s = Trim$(CStr(v))
    Set rx = CreateObject("VBScript.RegExp")
    rx.Global = True
    rx.Pattern = "(?:\+?\d[\s().-]*){8,}"
    s = rx.Replace(s, "[recapito omesso]")
    If Len(s) > 0 Then
        Select Case Left$(s, 1)
            Case "=", "+", "-", "@"
                s = "'" & s
        End Select
    End If
    SafeText = Left$(s, 450)
End Function

Private Function IsIsoDate(ByVal v As String) As Boolean
    On Error GoTo Invalid
    If Not v Like "####-##-##" Then Exit Function
    IsIsoDate = (Format$(DateSerial(CInt(Left$(v, 4)), _
        CInt(Mid$(v, 6, 2)), CInt(Right$(v, 2))), "yyyy-mm-dd") = v)
    Exit Function
Invalid:
    IsIsoDate = False
End Function

Private Function IsoToDate(ByVal v As String) As Date
    IsoToDate = DateSerial(CInt(Left$(v, 4)), CInt(Mid$(v, 6, 2)), CInt(Right$(v, 2)))
End Function

Private Function HasSheet(ByVal wb As Workbook, ByVal name As String) As Boolean
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = wb.Worksheets(name)
    On Error GoTo 0
    HasSheet = Not ws Is Nothing
End Function
