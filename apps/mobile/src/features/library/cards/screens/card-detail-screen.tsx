import { useMemo } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useArchiveCardMutation, useCardDetailQuery, useDeleteCardMutation } from "@/features/library/api";
import { cardDetailOnlyMutationContext } from "@/features/library/api/card-mutation-context";
import { CardStatusBadge } from "@/features/library/cards/components/card-status-badge";
import { cardDetailScreenStyles as styles } from "@/features/library/cards/screens/card-detail-screen.styles";
import { formatDateTimeLabel, getSourceTypeLabel } from "@/features/library/utils/library-formatters";
import {
  buildReadonlySourceDetailParams,
  buildSourceRelatedCardListParams,
} from "@/features/library/utils/library-navigation";
import { getStableArray } from "@/features/library/utils/library-state";
import { getCardDetailCapabilities } from "@/features/library/utils/library-view-capabilities";
import { libraryCopy } from "@/features/library/utils/library-copy";
import { defaultCardDetailMode } from "@/features/library/utils/library-view-modes";
import { type RootStackParamList } from "@/navigation/types";

function getCardTagKey(cardId: string, tag: string) {
  return `${cardId}:${tag}`;
}

function InfoRow(props: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{props.label}</Text>
      <Text style={styles.infoValue}>{props.value}</Text>
    </View>
  );
}

export function CardDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "CardDetail">) {
  const mode = route.params.mode ?? defaultCardDetailMode;
  const capabilities = getCardDetailCapabilities(mode);
  const cardMutationContext = route.params.cardMutationContext ?? cardDetailOnlyMutationContext;
  const sourceContextId = route.params.sourceContextId;

  const cardQuery = useCardDetailQuery(route.params.cardId);
  const archiveCardMutation = useArchiveCardMutation();
  const deleteCardMutation = useDeleteCardMutation();
  const card = cardQuery.data;
  const tagPreview = useMemo(() => getStableArray(card?.tags), [card?.tags]);
  const showSourceLink =
    capabilities.showSourceLink &&
    Boolean(card?.sourceId) &&
    (!sourceContextId || sourceContextId !== card?.sourceId);

  async function handleArchiveCard() {
    if (!card || card.status !== "active" || archiveCardMutation.isPending) {
      return;
    }

    try {
      await archiveCardMutation.mutateAsync({
        cardId: card.id,
        context: cardMutationContext,
      });
      Alert.alert(libraryCopy.actionCompleted, libraryCopy.cardDetail.archiveSuccessMessage);
    } catch (error) {
      Alert.alert(
        libraryCopy.cardDetail.archiveFailureTitle,
        error instanceof Error ? error.message : libraryCopy.loadFailed,
      );
    }
  }

  function handleDeleteCard() {
    if (!card || deleteCardMutation.isPending) {
      return;
    }

    Alert.alert(
      libraryCopy.cardDetail.deleteConfirmTitle,
      libraryCopy.cardDetail.deleteConfirmDescription,
      [
        { text: libraryCopy.cancel, style: "cancel" },
        {
          text: libraryCopy.deleteConfirm,
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCardMutation.mutateAsync({
                cardId: card.id,
                context: cardMutationContext,
              });

              if (navigation.canGoBack()) {
                navigation.goBack();
                return;
              }

              navigation.replace("CardList");
            } catch (error) {
              Alert.alert(
                libraryCopy.cardDetail.deleteFailureTitle,
                error instanceof Error ? error.message : libraryCopy.loadFailed,
              );
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={
          showSourceLink && card?.sourceId
            ? () => {
                const sourceId = card.sourceId;

                if (!sourceId) {
                  return;
                }

                navigation.navigate("SourceDetail", buildReadonlySourceDetailParams(sourceId));
              }
            : undefined
        }
        rightLabel={showSourceLink ? libraryCopy.cardDetail.sourceDetailAction : undefined}
        subtitle={mode === "source_related_readonly" ? "卡片内容" : "卡片详情"}
        title={card?.title ?? "知识卡片"}
      />

      {cardQuery.isLoading ? (
        <View style={styles.stateWrap}>
          <EmptyState
            description={libraryCopy.cardDetail.loadingDescription}
            title={libraryCopy.cardDetail.loadingTitle}
          />
        </View>
      ) : null}

      {cardQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            description={
              cardQuery.error instanceof Error
                ? cardQuery.error.message
                : libraryCopy.cardDetail.errorDescription
            }
            onRetry={() => cardQuery.refetch()}
            retryLabel={libraryCopy.retry}
            title={libraryCopy.cardDetail.errorTitle}
          />
        </View>
      ) : null}

      {card ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{card.title}</Text>
                <Text style={styles.heroMeta}>
                  {getSourceTypeLabel(card.sourceType)} · 最近更新 {formatDateTimeLabel(card.updatedAt)}
                </Text>
              </View>
              <CardStatusBadge status={card.status} />
            </View>

            {tagPreview.length > 0 ? (
              <View style={styles.tagsRow}>
                {tagPreview.map((tag) => (
                  <View key={getCardTagKey(card.id, tag)} style={styles.tag}>
                    <Text style={styles.tagLabel}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>卡片内容</Text>
            <Text style={styles.sectionText}>{card.content}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>来源信息</Text>
            <View style={styles.infoList}>
              <InfoRow label="来源类型" value={getSourceTypeLabel(card.sourceType)} />
              <InfoRow label="来源 ID" value={card.sourceId ?? "暂无来源 ID"} />
              <InfoRow label="创建时间" value={formatDateTimeLabel(card.createdAt)} />
              <InfoRow label="更新时间" value={formatDateTimeLabel(card.updatedAt)} />
            </View>

            {capabilities.showRelatedCardsLink && card.sourceId ? (
              <PrimaryButton
                label={libraryCopy.cardDetail.sourceCardsAction}
                onPress={() => {
                  const sourceId = card.sourceId;

                  if (!sourceId) {
                    return;
                  }

                  navigation.navigate("CardList", buildSourceRelatedCardListParams(sourceId));
                }}
                variant="secondary"
              />
            ) : null}
          </View>

          {capabilities.showOperations ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{libraryCopy.cardDetail.operationsTitle}</Text>

              <View style={styles.actionRow}>
                {card.status === "active" ? (
                  <PrimaryButton
                    disabled={archiveCardMutation.isPending}
                    iconName="archive-outline"
                    label={
                      archiveCardMutation.isPending
                        ? libraryCopy.cardDetail.archivePendingAction
                        : libraryCopy.cardDetail.archiveAction
                    }
                    onPress={handleArchiveCard}
                  />
                ) : null}

                {card.status === "archived" ? (
                  <PrimaryButton
                    disabled
                    iconName="archive"
                    label={libraryCopy.cardDetail.archivedAction}
                    variant="secondary"
                  />
                ) : null}

                <PrimaryButton
                  disabled={deleteCardMutation.isPending}
                  iconName="trash-outline"
                  label={
                    deleteCardMutation.isPending
                      ? libraryCopy.cardDetail.deletePendingAction
                      : libraryCopy.cardDetail.deleteAction
                  }
                  onPress={handleDeleteCard}
                  variant="secondary"
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
