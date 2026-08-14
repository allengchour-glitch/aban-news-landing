// MuenzePickup.cpp — siehe MuenzePickup.h
#include "MuenzePickup.h"
#include "MuenzJagdGameMode.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/Character.h"
#include "Kismet/GameplayStatics.h"

AMuenzePickup::AMuenzePickup()
{
	PrimaryActorTick.bCanEverTick = true;

	Kugel = CreateDefaultSubobject<USphereComponent>(TEXT("Kugel"));
	Kugel->InitSphereRadius(60.f);
	// Nur Overlaps melden, nichts blockieren — der Spieler soll durchlaufen können.
	Kugel->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Kugel;

	Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
	Mesh->SetupAttachment(RootComponent);
	Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void AMuenzePickup::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);
	AddActorLocalRotation(FRotator(0.f, DrehGrad * DeltaTime, 0.f));
}

void AMuenzePickup::NotifyActorBeginOverlap(AActor* OtherActor)
{
	Super::NotifyActorBeginOverlap(OtherActor);

	// Nur der Spieler-Charakter sammelt — nicht jeder Physik-Krümel, der vorbeirollt.
	if (!OtherActor || OtherActor != UGameplayStatics::GetPlayerCharacter(this, 0))
	{
		return;
	}

	if (AMuenzJagdGameMode* GM = GetWorld()->GetAuthGameMode<AMuenzJagdGameMode>())
	{
		GM->MuenzeEingesammelt();
	}

	if (SammelSound)
	{
		UGameplayStatics::PlaySoundAtLocation(this, SammelSound, GetActorLocation());
	}

	Destroy();
}
