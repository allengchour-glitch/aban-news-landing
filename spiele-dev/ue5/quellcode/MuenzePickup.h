// MuenzePickup.h — drehende Sammel-Münze für MuenzJagd (UE 5.x).
// Einbau: siehe ../README-UE5-START.md Schritt 2.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MuenzePickup.generated.h"

class USphereComponent;
class UStaticMeshComponent;
class USoundBase;

UCLASS()
class MUENZJAGD_API AMuenzePickup : public AActor
{
	GENERATED_BODY()

public:
	AMuenzePickup();

protected:
	virtual void NotifyActorBeginOverlap(AActor* OtherActor) override;

public:
	virtual void Tick(float DeltaTime) override;

	/** Kollisionskugel — der Spieler muss nur hineinlaufen. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Muenze")
	USphereComponent* Kugel;

	/** Sichtbares Mesh (im Editor zuweisen, z. B. Shape_Torus aus dem Starterinhalt). */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Muenze")
	UStaticMeshComponent* Mesh;

	/** Umdrehungen: Grad pro Sekunde. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Muenze")
	float DrehGrad = 120.f;

	/** Optionaler Einsammel-Sound (im Details-Panel zuweisen). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Muenze")
	USoundBase* SammelSound = nullptr;
};
