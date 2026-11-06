' Krypto-Cockpit: Autostart OHNE sichtbares Fenster.
' Die Aufgabenplanung startet dieses Skript bei der Anmeldung und alle 15 Minuten (Aufgabe "Krypto-Cockpit-Start"); es startet cockpit-start-still.bat
' unsichtbar (Fensterstil 0) und wartet nicht (False): das Cockpit laeuft danach weiter. Laeuft es schon, beendet sich der Start nach einer Sekunde.
' Ein sichtbares Konsolenfenster alle 15 Minuten wuerde stoeren und dazu verleiten, die Aufgabe abzuschalten.
Option Explicit
Dim fso, ordner, sh
Set fso = CreateObject("Scripting.FileSystemObject")
ordner = fso.GetParentFolderName(WScript.ScriptFullName)
Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c """"" & ordner & "\cockpit-start-still.bat""""", 0, False
