' Krypto-Pilot: Nachkontrolle von Pilot 2.0 OHNE sichtbares Fenster (17. Pruefung W4).
' Die Aufgabenplanung startet dieses Skript alle 10 Minuten und bei der Anmeldung (Aufgabe "Krypto-Pilot-Nachkontrolle"); es ruft
' krypto-auto.bat "nachkontrolle" auf - ohne Vermerk im Buch ist die in einer Sekunde fertig. Fensterstil 0 = unsichtbar, True = warten.
' Ein sichtbares Konsolenfenster alle 10 Minuten wuerde stoeren und dazu verleiten, die Aufgabe abzuschalten.
Option Explicit
Dim fso, ordner, sh, rc
Set fso = CreateObject("Scripting.FileSystemObject")
ordner = fso.GetParentFolderName(WScript.ScriptFullName)
Set sh = CreateObject("WScript.Shell")
rc = sh.Run("cmd /c """"" & ordner & "\krypto-auto.bat"" nachkontrolle""", 0, True)
WScript.Quit rc
