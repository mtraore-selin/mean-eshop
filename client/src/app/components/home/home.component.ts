import { map, distinctUntilChanged, filter, take, skip, withLatestFrom } from 'rxjs/operators';
import { Component, ChangeDetectionStrategy, OnDestroy, Signal, computed } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';

import { TranslateService } from '../../services/translate.service';
import { sortOptions } from '../../shared/constants';
import * as actions from './../../store/actions';
import * as fromRoot from '../../store/reducers';
import { Product, Category, Pagination, Cart } from '../../shared/models';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnDestroy {
  products: Signal<Product[]>;
  cartIds: Signal<{ [productID: string]: number }>;
  cart: Signal<Cart>;
  loadingProducts: Signal<boolean>;
  categories: Signal<Category[]>;
  pagination: Signal<Pagination>;
  category: Signal<string>;
  filterPrice: Signal<number>;
  maxPrice: Signal<number>;
  minPrice: Signal<number>;
  page: Signal<number>;
  sortBy: Signal<string>;
  currency: Signal<string>;
  lang: Signal<string>;
  categoriesSub: Subscription;
  productsSub: Subscription;
  sortOptions = sortOptions;
  sidebarOpened = false;

  readonly component = 'homeComponent';

  constructor(
    private store: Store<fromRoot.State>,
    private route: ActivatedRoute,
    private router: Router,
    private meta: Meta,
    private title: Title,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
  ) {
    this.category = toSignal(this.route.params.pipe(map((params) => params['category'])));
    this.page = toSignal(
      this.route.queryParams.pipe(
        map((params) => params['page']),
        map((page) => parseFloat(page)),
      ),
    );
    this.sortBy = toSignal(this.route.queryParams.pipe(map((params) => params['sort'])));
    this.lang = toSignal(this.translate.getLang$().pipe(filter((lang: string) => !!lang)));
    this.cart = this.store.selectSignal(fromRoot.getCart);
    this.maxPrice = this.store.selectSignal(fromRoot.getMaxPrice);
    this.minPrice = this.store.selectSignal(fromRoot.getMinPrice);
    this.filterPrice = this.store.selectSignal(fromRoot.getPriceFilter);
    this.loadingProducts = this.store.selectSignal(fromRoot.getLoadingProducts);
    this.products = this.store.selectSignal(fromRoot.getProducts);
    this.cartIds = computed(() => {
      if (!this.cart()) {
        return {};
      }
      return this.cart().items && this.cart().items.length ? this.cart().items.reduce((prev, curr) => ({ ...prev, [curr.id]: curr.qty }), {}) : {};
    });

    this.title.setTitle('Eshop Mean');
    this.meta.updateTag({ name: 'description', content: 'Angular - Node.js - Eshop application - MEAN Eshop with dashboard' });

    this.categories = this.store.selectSignal(fromRoot.getCategories);
    this.pagination = this.store.selectSignal(fromRoot.getPagination);
    this.currency = this.store.selectSignal(fromRoot.getCurrency);

    this._loadCategories();
    this._loadProducts();
  }

  addToCart(id: string): void {
    this.store.dispatch(new actions.AddToCart('?id=' + id));

    this.translate
      .getTranslations$()
      .pipe(
        map((translations) =>
          translations
            ? { message: translations['ADDED_TO_CART'] || 'Added to cart', action: translations['TO_CART'] || 'To Cart' }
            : { message: 'Added to cart', action: 'To Cart' },
        ),
        take(1),
      )
      .subscribe(({ message, action }) => {
        let snackBarRef = this.snackBar.open(message, action, { duration: 3000 });
        snackBarRef
          .onAction()
          .pipe(take(1))
          .subscribe(() => {
            this.router.navigate(['/' + this.lang() + '/cart']);
          });
      });
  }

  removeFromCart(id: string): void {
    this.store.dispatch(new actions.RemoveFromCart('?id=' + id));
  }

  priceRange(price: number): void {
    if (this.filterPrice() !== price) {
      this.store.dispatch(new actions.FilterPrice(price));
    }
  }

  changeCategory(): void {
    this.store.dispatch(new actions.UpdatePosition({ productsComponent: 0 }));
  }

  changePage(page: number): void {
    if (this.category()) {
      this.router.navigate(['/' + this.lang() + '/product/category/' + this.category()], {
        queryParams: { sort: this.sortBy() || 'newest', page: page || 1 },
      });
    } else {
      this.router.navigate(['/' + this.lang() + '/product/all'], {
        queryParams: { sort: this.sortBy() || 'newest', page: page || 1 },
      });
    }
    this.store.dispatch(new actions.UpdatePosition({ productsComponent: 0 }));
  }

  changeSort(sort: string): void {
    if (this.category()) {
      this.router.navigate(['/' + this.lang() + '/product/category/' + this.category()], {
        queryParams: { sort, page: this.page() || 1 },
      });
    } else {
      this.router.navigate(['/' + this.lang() + '/product/all'], { queryParams: { sort, page: this.page() || 1 } });
    }
    this.store.dispatch(new actions.UpdatePosition({ productsComponent: 0 }));
  }

  toggleSidebar() {
    this.sidebarOpened = !this.sidebarOpened;
  }

  ngOnDestroy(): void {
    this.categoriesSub.unsubscribe();
    this.productsSub.unsubscribe();
  }

  private _loadCategories(): void {
    if (!this.categories()?.length) {
      this.store.dispatch(new actions.GetCategories(this.lang()));
    }

    this.categoriesSub = toObservable(this.lang)
      .pipe(distinctUntilChanged(), skip(1))
      .subscribe((lang: string) => {
        this.store.dispatch(new actions.GetCategories(lang));
      });
  }

  private _loadProducts(): void {
    this.productsSub = combineLatest([
      toObservable(this.lang).pipe(distinctUntilChanged()),
      toObservable(this.category).pipe(distinctUntilChanged()),
      toObservable(this.filterPrice).pipe(distinctUntilChanged()),
      this.route.queryParams.pipe(
        map((params) => ({ page: params['page'], sort: params['sort'] })),
        distinctUntilChanged(),
      ),
    ]).subscribe(([lang, category, filterPrice, { page, sort }]) => {
      this.store.dispatch(new actions.GetProducts({ lang, category, maxPrice: filterPrice, page: page || 1, sort: sort || 'newest' }));
    });
  }
}
