'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useEffect, useMemo } from 'react';
import { Switch } from '../ui/switch';
import { useLanguage } from '@/hooks/use-language';
import { CROP_TYPES } from '@/lib/crop-data';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const useListingSchema = () => {
    const { t } = useLanguage();
    return useMemo(() => z.object({
        cropName: z.string().min(1, { message: t('addListingDialog.validation.cropName') }),
        wholesalePrice: z.coerce.number().min(0, { message: t('addListingDialog.validation.price') }),
        retailPrice: z.coerce.number().min(0, { message: t('addListingDialog.validation.price') }),
        wholesaleQuantity: z.coerce.number().int().min(0, { message: t('addListingDialog.validation.quantity') }),
        retailQuantity: z.coerce.number().int().min(0, { message: t('addListingDialog.validation.quantity') }),
        unit: z.string().min(1, { message: t('addListingDialog.validation.unit') }),
        qualityGrade: z.enum(['Premium', 'Grade A', 'Standard', 'Low']),
        certifications: z.string().optional(),
        imageUrl: z.string().optional(),
        imageId: z.string().optional(),
        hasSampleBag: z.boolean().default(false),
    }), [t]);
}


export function AddListingDialog({ open, onOpenChange, listingToEdit }: { open: boolean, onOpenChange: (open: boolean) => void, listingToEdit?: any | null }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const isEditMode = !!listingToEdit;
  const { t, language } = useLanguage();
  const listingSchema = useListingSchema();

  const customCropsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'custom_crops');
  }, [firestore]);
  const { data: customCropsData } = useCollection<{name: string}>(customCropsQuery);

  const allCrops = useMemo(() => {
    const predefined = CROP_TYPES.map(crop => ({
      value: crop.key,
      label: t(`crops.${crop.key}`),
    }));
    const custom = customCropsData?.map(crop => ({
      value: crop.name,
      label: crop.name, // Custom crops are not translated
    })) || [];
    
    const combined = [...predefined, ...custom];
    let uniqueCrops = Array.from(new Map(combined.map(item => [item.value, item])).values());
    
    // Filter out "Red Pepper"
    uniqueCrops = uniqueCrops.filter(crop => crop.value.toLowerCase() !== 'red pepper');
    
    uniqueCrops.sort((a, b) => a.label.localeCompare(b.label, language));

    return uniqueCrops;
  }, [customCropsData, t, language]);

  const form = useForm<z.infer<typeof listingSchema>>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      cropName: '',
      wholesalePrice: 0,
      retailPrice: 0,
      wholesaleQuantity: 0,
      retailQuantity: 0,
      unit: 'kg',
      qualityGrade: 'Standard',
      certifications: '',
      imageUrl: '',
      imageId: '',
      hasSampleBag: false,
    },
  });

  const imageUrl = form.watch('imageUrl');

  useEffect(() => {
    if (open) {
        if (isEditMode && listingToEdit) {
            const imageFromPlaceholder = PlaceHolderImages.find((img) => img.id === listingToEdit.imageId);
            const initialImageUrl = listingToEdit.imageUrl || imageFromPlaceholder?.imageUrl;
            
            form.reset({
                ...listingToEdit,
                imageUrl: initialImageUrl,
                cropName: listingToEdit.cropName,
            });
        } else {
            form.reset({
                cropName: '',
                wholesalePrice: 0,
                retailPrice: 0,
                wholesaleQuantity: 0,
                retailQuantity: 0,
                unit: 'kg',
                qualityGrade: 'Standard',
                certifications: '',
                imageUrl: '',
                imageId: '',
                hasSampleBag: false,
            });
        }
    }
  }, [listingToEdit, isEditMode, open, form]);

  const onSubmit = (values: z.infer<typeof listingSchema>) => {
    if (!user || !firestore) return;

    const cropNameToSave = values.cropName;

    const finalValues: Record<string, any> = { ...values, cropName: cropNameToSave };
    if (!finalValues.imageUrl) {
        const matchingCrop = CROP_TYPES.find(c => c.key === finalValues.cropName);
        if (matchingCrop) {
            finalValues.imageId = matchingCrop.imageId;
        }
    }


    if (isEditMode && listingToEdit) {
        const listingRef = doc(firestore, 'cropListings', listingToEdit.id);
        updateDocumentNonBlocking(listingRef, finalValues);
        toast({
            title: t('addListingDialog.listingUpdated'),
            description: t('addListingDialog.listingUpdatedDescription', { cropName: cropNameToSave }),
        });
    } else {
        const cropListingsRef = collection(firestore, 'cropListings');
        addDocumentNonBlocking(cropListingsRef, {
            ...finalValues,
            userId: user.uid,
        });
        toast({
            title: t('addListingDialog.listingAdded'),
            description: t('addListingDialog.listingAddedDescription', { cropName: cropNameToSave }),
        });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('addListingDialog.editTitle') : t('addListingDialog.addTitle')}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t('addListingDialog.editDescription') : t('addListingDialog.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                <FormField
                    control={form.control}
                    name="cropName"
                    render={({ field }) => (
                        <FormItem className="col-span-2">
                        <FormLabel>{t('addListingDialog.cropName')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder={t('addListingDialog.selectCrop')} /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {allCrops.map(crop => (
                                    <SelectItem key={crop.value} value={crop.value}>{crop.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t('addListingDialog.image')}</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                field.onChange(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            } else {
                              field.onChange('');
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {imageUrl && (
                  <div className="col-span-2 relative h-40 w-full rounded-md overflow-hidden border">
                    <Image
                      src={imageUrl}
                      alt="Crop image preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <FormField
                    control={form.control}
                    name="wholesalePrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('addListingDialog.wholesalePrice')}</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder={t('addListingDialog.pricePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="retailPrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('addListingDialog.retailPrice')}</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder={t('addListingDialog.retailPricePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="wholesaleQuantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('addListingDialog.wholesaleQuantity')}</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder={t('addListingDialog.wholesaleQuantityPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="retailQuantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('addListingDialog.retailQuantity')}</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder={t('addListingDialog.retailQuantityPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('addListingDialog.unit')}</FormLabel>
                        <FormControl>
                            <Input placeholder={t('addListingDialog.unitPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="qualityGrade"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('addListingDialog.qualityGrade')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Premium">{t('addListingDialog.premium')}</SelectItem>
                                <SelectItem value="Grade A">{t('addListingDialog.gradeA')}</SelectItem>
                                <SelectItem value="Standard">{t('addListingDialog.standard')}</SelectItem>
                                <SelectItem value="Low">{t('addListingDialog.low')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="certifications"
                    render={({ field }) => (
                        <FormItem className="col-span-2">
                        <FormLabel>{t('addListingDialog.certifications')}</FormLabel>
                        <FormControl>
                            <Input placeholder={t('addListingDialog.certificationsPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="hasSampleBag"
                    render={({ field }) => (
                        <FormItem className="col-span-2 flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>{t('addListingDialog.offerSample')}</FormLabel>
                                <FormDescription>
                                    {t('addListingDialog.offerSampleDescription')}
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline" type="button">{t('common.cancel')}</Button>
                </DialogClose>
                <Button type="submit">{isEditMode ? t('addListingDialog.save') : t('addListingDialog.add')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
