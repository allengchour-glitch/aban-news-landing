// MuenzJagdGameMode.cpp — siehe MuenzJagdGameMode.h
#include "MuenzJagdGameMode.h"
#include "MuenzePickup.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/Engine.h"

void AMuenzJagdGameMode::BeginPlay()
{
	Super::BeginPlay();

	// Beim Start zählen, wie viele Münzen der Level-Designer verteilt hat —
	// so stimmt "x von y" auch, wenn du später Münzen dazustellst oder löschst.
	TArray<AActor*> Alle;
	UGameplayStatics::GetAllActorsOfClass(this, AMuenzePickup::StaticClass(), Alle);
	MuenzenGesamt = Alle.Num();
}

void AMuenzJagdGameMode::MuenzeEingesammelt()
{
	++GezaehlteMuenzen;

	const FString Text = (GezaehlteMuenzen >= MuenzenGesamt && MuenzenGesamt > 0)
		? TEXT("ALLE MUENZEN GEFUNDEN — gewonnen!")
		: FString::Printf(TEXT("Muenzen: %d / %d"), GezaehlteMuenzen, MuenzenGesamt);

	if (GEngine)
	{
		GEngine->AddOnScreenDebugMessage(1, 3.f, FColor::Yellow, Text);
	}
	UE_LOG(LogTemp, Log, TEXT("%s"), *Text);
}
