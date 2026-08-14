// MuenzJagdGameMode.h — zählt die Münzen und meldet den Sieg.
// Einbau: siehe ../README-UE5-START.md Schritt 2 (World Settings → GameMode Override).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "MuenzJagdGameMode.generated.h"

UCLASS()
class MUENZJAGD_API AMuenzJagdGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	virtual void BeginPlay() override;

	/** Von AMuenzePickup gerufen, wenn der Spieler eine Münze berührt. */
	UFUNCTION(BlueprintCallable, Category = "MuenzJagd")
	void MuenzeEingesammelt();

	/** Für das HUD (WBP_HUD bindet hierauf). */
	UPROPERTY(BlueprintReadOnly, Category = "MuenzJagd")
	int32 GezaehlteMuenzen = 0;

	UPROPERTY(BlueprintReadOnly, Category = "MuenzJagd")
	int32 MuenzenGesamt = 0;
};
