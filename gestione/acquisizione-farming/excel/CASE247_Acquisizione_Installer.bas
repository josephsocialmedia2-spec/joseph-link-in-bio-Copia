Attribute VB_Name = "CASE247Acquisizione"
Option Explicit

' CASE247 - INSTALLATORE PER IL FOGLIO ACQUISIZIONE (EXCEL DESKTOP)
' Importa il .bas con ALT+F11 > File > Importa file.
' Salva la cartella Excel come .xlsm; esegui InstallaAcquisizioneCASE247 con ALT+F8.
' Nessun dato di contatto viene incorporato o pubblicato dal modulo.
' Il CSV e' compatibile con "Notizie & Contatti" nel Laboratorio Avigliana.

Private Const FIRST_DATA_ROW As Long = 7
Private Const LAST_DATA_ROW As Long = 5006

Public Sub InstallaAcquisizioneCASE247()
    Dim wb As Workbook, ws As Worksheet, n As String
    Dim fields As Variant, i As Long, shp As Shape
    On Error GoTo Failure
    Set wb = ActiveWorkbook
    If wb Is Nothing Then Exit Sub
    If wb.ProtectStructure Then
        MsgBox "La cartella ha la struttura protetta.", vbExclamation
        Exit Sub
    End If
    n = "Acquisizione"
    If SheetExists(wb, n) Then
        n = "Acquisizione CASE247"
        i = 2
        Do While SheetExists(wb, n)
            n = "Acquisizione C247 " & CStr(i)
            i = i + 1
        Loop
    End If
    Application.ScreenUpdating = False
    Set ws = wb.Worksheets.Add(After:=wb.Worksheets(wb.Worksheets.Count))
    ws.Name = n
    ws.Cells.Font.Name = "Aptos"
    ws.Cells.Font.Size = 10
    ws.Range("A1:J2").Merge
    With ws.Range("A1:J2")
        .Value = "JOSEPH MALAFRONTE | CASE247 ACQUISIZIONE"
        .Interior.Color = RGB(19, 22, 29)
        .Font.Color = RGB(255, 255, 255)
        .Font.Bold = True
        .Font.Size = 18
        .VerticalAlignment = xlCenter
        .IndentLevel = 1
    End With
    ws.Range("A3:J4").Merge
    With ws.Range("A3:J4")
        .Value = "Dati conservati in questo Excel. Inserisci solo contatti verificati e trattabili lecitamente. Usa il pulsante per esportare un CSV e importalo manualmente nella scheda web Notizie & Contatti."
        .Interior.Color = RGB(255, 246, 217)
        .WrapText = True
        .VerticalAlignment = xlCenter
        .IndentLevel = 1
    End With
    ws.Rows("1:2").RowHeight = 25
    ws.Rows("3:4").RowHeight = 24
    fields = Array("Data", "Zona", "Indirizzo", "Riferimento", "Fonte", "Stato", "Azione", "Data richiamo", "Ora richiamo", "Note")
    For i = 0 To UBound(fields)
        ws.Cells(6, i + 1).Value = fields(i)
    Next i
    With ws.Range("A6:J6")
        .Interior.Color = RGB(19, 22, 29)
        .Font.Color = RGB(255, 255, 255)
        .Font.Bold = True
        .RowHeight = 29
    End With
    ws.Columns("A").ColumnWidth = 16
    ws.Columns("B").ColumnWidth = 28
    ws.Columns("C").ColumnWidth = 30
    ws.Columns("D").ColumnWidth = 25
    ws.Columns("E").ColumnWidth = 28
    ws.Columns("F").ColumnWidth = 18
    ws.Columns("G").ColumnWidth = 32
    ws.Columns("H").ColumnWidth = 17
    ws.Columns("I").ColumnWidth = 15
    ws.Columns("J").ColumnWidth = 42
    ws.Columns("K").ColumnWidth = 3
    ws.Columns("L").ColumnWidth = 28
    ws.Columns("M").ColumnWidth = 17
    ws.Range("A7:J5006").Interior.Color = RGB(252, 250, 245)
    ws.Range("A7:A5006").NumberFormat = "dd/mm/yyyy"
    ws.Range("H7:H5006").NumberFormat = "dd/mm/yyyy"
    ws.Range("I7:I5006").NumberFormat = "hh:mm"
    ws.Range("A6:J5006").AutoFilter
    AddList ws.Range("F7:F5006"), "Nuovo,Contattato,Qualificato,Appuntamento,Pausa,Scartato"
    AddList ws.Range("E7:E5006"), "Annuncio pubblico,Contatto spontaneo,Incontro professionale,Osservazione territoriale,Altro"
    AddList ws.Range("G7:G5006"), "Nessuna,Lettera informativa preparata,Lettera consegnata,Biglietto consegnato,Risposta spontanea,Incontro"
    With ws.Range("H7:H5006").FormatConditions
        .Delete
        With .Add(Type:=xlExpression, Formula1:="=AND(ISNUMBER($H7),$H7<TODAY(),$F7<>""Scartato"")")
            .Interior.Color = RGB(255, 223, 209)
        End With
    End With
    ws.Range("L1:M2").Merge
    With ws.Range("L1:M2")
        .Value = "INDICATORI ACQUISIZIONE"
        .Interior.Color = RGB(19, 22, 29)
        .Font.Color = RGB(255, 255, 255)
        .Font.Bold = True
        .VerticalAlignment = xlCenter
    End With
    ws.Range("L4").Value = "Contatti con indirizzo"
    ws.Range("M4").Formula = "=COUNTA(C7:C5006)"
    ws.Range("L5").Value = "Follow-up aperti"
    ws.Range("M5").Formula = "=COUNTIFS(H7:H5006,"">0"",F7:F5006,""<>Scartato"")"
    ws.Range("L6").Value = "Lettere consegnate"
    ws.Range("M6").Formula = "=COUNTIF(G7:G5006,""Lettera consegnata"")"
    ws.Range("L7").Value = "Appuntamenti"
    ws.Range("M7").Formula = "=COUNTIF(F7:F5006,""Appuntamento"")"
    ws.Range("M4:M7").Font.Bold = True
    ws.Range("M4:M7").Font.Color = RGB(173, 130, 42)
    ws.Range("L9:M10").Merge
    ws.Range("L9").Value = "Esportazione CSV locale: nessun upload automatico sul repository."
    ws.Range("L9:M10").WrapText = True
    Set shp = ws.Shapes.AddShape(msoShapeRoundedRectangle, ws.Range("L12").Left, ws.Range("L12").Top, 225, 37)
    shp.Name = "CASE247_Export"
    shp.TextFrame2.TextRange.Text = "ESPORTA CSV CASE247"
    shp.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
    shp.Fill.ForeColor.RGB = RGB(173, 130, 42)
    shp.Line.Visible = msoFalse
    shp.OnAction = "EsportaAcquisizioneCSV"
    Set shp = ws.Shapes.AddShape(msoShapeRoundedRectangle, ws.Range("L15").Left, ws.Range("L15").Top, 225, 37)
    shp.Name = "CASE247_Validate"
    shp.TextFrame2.TextRange.Text = "VERIFICA RIGHE"
    shp.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
    shp.Fill.ForeColor.RGB = RGB(19, 22, 29)
    shp.Line.Visible = msoFalse
    shp.OnAction = "VerificaAcquisizioneCASE247"
    ws.Hyperlinks.Add ws.Range("L19"), "https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/acquisizione-farming/", , , "Apri Laboratorio Avigliana"
    ws.Activate
    ws.Range("A7").Select
    ActiveWindow.SplitRow = 6
    ActiveWindow.FreezePanes = True
    Application.ScreenUpdating = True
    MsgBox "Foglio '" & n & "' installato. Salva il file in formato .xlsm.", vbInformation
    Exit Sub
Failure:
    Application.ScreenUpdating = True
    MsgBox "Installazione interrotta: " & Err.Description, vbExclamation
End Sub

Public Sub VerificaAcquisizioneCASE247()
    Dim ws As Worksheet, r As Long, lastRow As Long, errors As Long, info As String
    Set ws = AcquisitionSheet()
    If ws Is Nothing Then Exit Sub
    lastRow = ws.Cells(ws.Rows.Count, "C").End(xlUp).Row
    For r = FIRST_DATA_ROW To lastRow
        If Len(Trim$(CStr(ws.Cells(r, "C").Value))) > 0 Then
            If Not IsDate(ws.Cells(r, "A").Value) Or Len(Trim$(CStr(ws.Cells(r, "E").Value))) = 0 Then
                errors = errors + 1: info = info & "Riga " & r & ": data o fonte mancanti" & vbCrLf
            End If
            If Len(Trim$(CStr(ws.Cells(r, "H").Value))) > 0 Then
                If Not IsValidFollowup(ws.Cells(r, "H").Value, ws.Cells(r, "I").Value) Then
                    errors = errors + 1: info = info & "Riga " & r & ": follow-up fuori fascia" & vbCrLf
                End If
            End If
        End If
    Next r
    If errors = 0 Then
        MsgBox "Verifica completata. Nessuna anomalia nelle righe compilate.", vbInformation
    Else
        MsgBox CStr(errors) & " anomalie:" & vbCrLf & Left$(info, 1700), vbExclamation
    End If
End Sub

Public Sub EsportaAcquisizioneCSV()
    Dim ws As Worksheet, keys As Variant, stream As Object, dest As Variant
    Dim r As Long, i As Long, lastRow As Long, exported As Long, csv As String, val As String
    Set ws = AcquisitionSheet()
    If ws Is Nothing Then Exit Sub
    keys = Array("date", "zone", "address", "name", "source", "status", "action", "followDate", "followTime", "notes")
    For i = 0 To 9
        csv = csv & IIf(i = 0, "", ";") & QuoteCSV(keys(i))
    Next i
    csv = csv & vbCrLf
    lastRow = ws.Cells(ws.Rows.Count, "C").End(xlUp).Row
    For r = FIRST_DATA_ROW To lastRow
        If Len(Trim$(CStr(ws.Cells(r, "C").Value))) > 0 Then
            If Not IsDate(ws.Cells(r, "A").Value) Or Len(Trim$(CStr(ws.Cells(r, "E").Value))) = 0 Then
                MsgBox "Riga " & r & ": data e fonte sono obbligatorie.", vbExclamation
                Exit Sub
            End If
            If Len(Trim$(CStr(ws.Cells(r, "H").Value))) > 0 Then
                If Not IsValidFollowup(ws.Cells(r, "H").Value, ws.Cells(r, "I").Value) Then
                    MsgBox "Riga " & r & ": richiamo solo lun-ven, ore 14:30-16:15.", vbExclamation
                    Exit Sub
                End If
            End If
            For i = 1 To 10
                Select Case i
                    Case 1, 8
                        val = DateISO(ws.Cells(r, i).Value)
                    Case 9
                        val = TimeISO(ws.Cells(r, i).Value)
                    Case Else
                        val = CStr(ws.Cells(r, i).Value)
                End Select
                csv = csv & IIf(i = 1, "", ";") & QuoteCSV(val)
            Next i
            csv = csv & vbCrLf
            exported = exported + 1
        End If
    Next r
    If exported = 0 Then
        MsgBox "Nessun indirizzo compilato. Non si esportano righe dimostrative.", vbInformation
        Exit Sub
    End If
    dest = Application.GetSaveAsFilename("CASE247_Contatti_Avigliana_" & Format$(Date, "yyyymmdd") & ".csv", "CSV (*.csv),*.csv")
    If VarType(dest) = vbBoolean Then Exit Sub
    On Error GoTo Failure
    Set stream = CreateObject("ADODB.Stream")
    stream.Type = 2
    stream.Charset = "utf-8"
    stream.Open
    stream.WriteText csv
    stream.SaveToFile CStr(dest), 2
    stream.Close
    MsgBox exported & " righe esportate. Importa il CSV in Notizie & Contatti sul sito CASE247.", vbInformation
    Exit Sub
Failure:
    On Error Resume Next
    If Not stream Is Nothing Then stream.Close
    MsgBox "Errore esportazione CSV. Verifica il percorso del file.", vbExclamation
End Sub

Private Function AcquisitionSheet() As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ActiveSheet
    If Not ws Is Nothing Then
        If LCase$(Trim$(CStr(ws.Range("A6").Value))) = "data" And _
           LCase$(Trim$(CStr(ws.Range("C6").Value))) = "indirizzo" Then
            Set AcquisitionSheet = ws
            Exit Function
        End If
    End If
    On Error GoTo 0
    For Each ws In ActiveWorkbook.Worksheets
        If LCase$(Trim$(CStr(ws.Range("A6").Value))) = "data" And _
           LCase$(Trim$(CStr(ws.Range("C6").Value))) = "indirizzo" Then
            Set AcquisitionSheet = ws
            Exit Function
        End If
    Next ws
    MsgBox "Prima esegui InstallaAcquisizioneCASE247.", vbExclamation
End Function

Private Function IsValidFollowup(ByVal d As Variant, ByVal tm As Variant) As Boolean
    If Not IsDate(d) Or Not IsDate(tm) Then Exit Function
    If Weekday(CDate(d), vbMonday) > 5 Then Exit Function
    IsValidFollowup = TimeValue(CDate(tm)) >= TimeSerial(14, 30, 0) And _
                      TimeValue(CDate(tm)) <= TimeSerial(16, 15, 0)
End Function

Private Function DateISO(ByVal v As Variant) As String
    If IsDate(v) Then DateISO = Format$(CDate(v), "yyyy-mm-dd")
End Function

Private Function TimeISO(ByVal v As Variant) As String
    If IsDate(v) Then TimeISO = Format$(CDate(v), "hh:nn")
End Function

Private Function QuoteCSV(ByVal v As Variant) As String
    Dim t As String
    t = CStr(v)
    If Len(t) > 0 Then
        Select Case Left$(LTrim$(t), 1)
            Case "=", "+", "-", "@"
                t = "'" & t
        End Select
    End If
    QuoteCSV = """" & Replace(t, """", """""") & """"
End Function

Private Sub AddList(ByVal target As Range, ByVal choices As String)
    With target.Validation
        .Delete
        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, Formula1:=choices
        .IgnoreBlank = True
        .InCellDropdown = True
        .ShowError = True
    End With
End Sub

Private Function SheetExists(ByVal wb As Workbook, ByVal name As String) As Boolean
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = wb.Worksheets(name)
    On Error GoTo 0
    SheetExists = Not ws Is Nothing
End Function
