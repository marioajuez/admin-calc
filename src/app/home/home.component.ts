
import {ChangeDetectorRef, Component,ElementRef,EventEmitter,OnInit,Output,ViewChild,AfterViewInit} from '@angular/core';
import { FormGroup, FormControl, NgForm } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

interface dataTable{
  days?:number,
  date?:any,
  amount:number,
  dailyInterest?:number,
  dailyRewards?:number,
  membershipBalance?:number,
  rebuy?:number,
  isCheck?:boolean,
  index?:number
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  @ViewChild('f', { static: true }) ngForm: NgForm;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('table', {read: ElementRef}) paginatorTable: ElementRef;
  @ViewChild('table') table_: MatTable<any>;
  
  userData = {
    date: new Date(),
    membership: '300',
  };

  listFilter = [
    { name:'-- no filters --', value: "all"},
    { name:'yes', value: 'true'},
    { name:'no',value: 'false'}
  ]
  select = this.listFilter[0].value;
  public optionRebuy = "default"


// ----- variables to display in view (template)  ---
  public membership3X = parseFloat(this.userData.membership) * 3.0;
  public recompenseFinal: number;
  public dateReturnInvest = {date: null,day: null};
// ------------------------

  table: dataTable[]= [];
  // public dataSource = new MatTableDataSource();
  public dataSource:MatTableDataSource<any>;
  public displayedColumns: string[] = ['#','day','date','amount','dailyInterest','dailyRewards','rebuy','optionRebuy','balance'];

  filterSelect = '';
  timeout: any = null;

// --------- variables to store calculations ------------
  private rebuy;
  private amount;
  private dailyRewards;
  private membershipBalance
// --------------------------

// ----  constants calc dependients
  public initialMembershipLeverage: number;
  public percentRewards: number;
  public totalDays: number;
  public minimumBalanceRebuy: number;
//---------------

// var for send event to other component
  eventForm:Subject<any> = new Subject();
  eventCheck:Subject<any> = new Subject();

// --------------------------------------------
  constructor() {

     // view template

            //   // membership 1.0
      this.totalDays = 600;
      this.initialMembershipLeverage = 3;
      this.percentRewards = 0.005;
      this.minimumBalanceRebuy = 50;

    // membership 2.0
    // this.totalDays = 1333;
    // this.initialMembershipLeverage = 4;
    // this.percentRewards = 0.003;
    // this.minimumBalanceRebuy = 125;



    this.initilizateTable();
    this.dataSource = new MatTableDataSource(this.table);
    this.dataSource.filterPredicate = this.createFilter();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }


  ngOnInit() {
    this.returnInvestmentDate();
    this.ngForm.form.valueChanges.subscribe((form) => {
      this.filterSelect = form.select;
      this.dataSource.filter = (this.filterSelect); 
      this.eventForm.next(1);
    });
  }

  protected initilizateTable() {

    this.amount = Number(this.userData.membership);
    this.membershipBalance = this.amount *  this.initialMembershipLeverage  - this.amount * this.percentRewards;
    this.dailyRewards = this.amount * this.percentRewards;
    this.rebuy = Number((this.dailyRewards / this.minimumBalanceRebuy).toString().split('.')[0]) * this.minimumBalanceRebuy;

    this.calculate({
        amount: this.amount,
        dailyRewards: this.dailyRewards,
        membershipBalance: this.membershipBalance,
        rebuy:this.rebuy,
        isCheck: false,
        index:-1
      },{initializateTable: true, rebuyNever:true})
  }

  private createOrUpdateTable(data:dataTable, initializateTable = false){

    if(initializateTable){
      this.table.push({
        days: data.days+1,
        date:new Date(this.userData.date).setDate(
          new Date(this.userData.date).getDate() + data.days),
        amount: data.amount,
        dailyInterest: data.dailyInterest ,
        dailyRewards: data.dailyRewards,
        rebuy: data.rebuy,
        membershipBalance: data.membershipBalance,
        isCheck: data.isCheck
      });
    }else{
      this.table[data.days].amount = data.amount;
      this.table[data.days].dailyInterest = data.dailyInterest;
      this.table[data.days].dailyRewards = data.dailyRewards;
      this.table[data.days].rebuy = data.rebuy;
      this.table[data.days].membershipBalance = data.membershipBalance;
      this.table[data.days].isCheck = data.isCheck;
    }
  }

  private calculate(data:dataTable, { rebuyNever= false, rebuyAlways = false, initializateTable = false}= {}){

    //se inicializa el ciclo segun el indice que llegue
    for (let i = data.index+1; i < this.totalDays;i++){

      // se crea por primera la tabla de datos o se actualiza
      this.createOrUpdateTable({
        days: i,
        amount: data.amount,
        dailyInterest: data.amount * this.percentRewards,
        dailyRewards: data.dailyRewards,
        rebuy: data.rebuy,
        membershipBalance: data.membershipBalance,
        isCheck: data.isCheck,
    }, initializateTable); 

      if (data.dailyRewards >= this.minimumBalanceRebuy){
              if(rebuyNever){
                  // esta formula es para que nunca se reinvierta.
                  data.amount = parseFloat(this.userData.membership)
                  data.membershipBalance +=- data.amount * this.percentRewards;
              }
              else if( rebuyAlways || !data.isCheck){
                 //esta formula es para que se reinvierta siempre o algunas veces.
                this.table[i].isCheck = true;
                data.amount += data.rebuy;
                data.membershipBalance += data.rebuy * this.initialMembershipLeverage - data.amount * this.percentRewards;
              }else{
                 //esta formula es para que no se reinvierta.
                this.table[i].isCheck = false;
                data.amount = data.amount;
                data.membershipBalance +=- data.amount * this.percentRewards;
              }
              data.dailyRewards -= data.rebuy;
      }
      else data.membershipBalance += data.rebuy * this.initialMembershipLeverage  - data.amount * this.percentRewards; // Recompensas en Saldo en ejecución

      data.dailyRewards += data.amount * this.percentRewards; // Saldo Diario de las recompensas
      data.rebuy =  parseFloat((data.dailyRewards / this.minimumBalanceRebuy).toString().split('.')[0]) * this.minimumBalanceRebuy; // se obtiene el valor de la recompra
    }
    this.recompenseFinal = this.table[this.table.length - 1].membershipBalance;
    // console.log(this.recompenseFinal);
    this.returnInvestmentDate();
  }

  public check(event, indice, indiceFilter?:number) {

    setTimeout(() => {
        this.optionRebuy = "default";
        const idCheck = indice - 1;
        this.table[idCheck].isCheck = event.checked;
        

        console.log( this.table[idCheck]);
        console.log(this.table[this.table.length - 1]);


        if (this.table[idCheck].isCheck)this.invert(idCheck,this.table[idCheck].isCheck)
        else this.retire(idCheck, this.table[idCheck].isCheck);
        this.dataSource.data = this.dataSource.data;

        console.log(this.recompenseFinal);
    
  }, 250);

  }

  protected updateTable(){

    this.optionRebuy = "default";
    this.select = this.listFilter[0].value;
    
    this.amount = Number(this.userData.membership);
    this.dailyRewards = this.amount * this.percentRewards;
    this.rebuy = Number((this.dailyRewards / this.minimumBalanceRebuy).toString().split('.')[0]) * this.minimumBalanceRebuy;
    this.membershipBalance = this.amount * this.initialMembershipLeverage - this.amount * this.percentRewards;

    this.calculate(
      {
        amount: this.amount ,
        dailyRewards: this.dailyRewards,
        membershipBalance: this.membershipBalance,
        rebuy:this.rebuy,
        isCheck:true,
        index:-1
      },{
        rebuyAlways: true
      }
    )
  }

  public rebuyNever(){

    this.amount = parseFloat(this.userData.membership);
    this.membershipBalance = this.amount * this.initialMembershipLeverage - this.amount * this.percentRewards;
    this.dailyRewards = this.amount * this.percentRewards;
    this.rebuy=parseFloat((this.dailyRewards / this.minimumBalanceRebuy).toString().split('.')[0]) *  this.minimumBalanceRebuy;

    this.calculate({
          amount: this.amount ,
          dailyRewards: this.dailyRewards,
          membershipBalance: this.membershipBalance,
          rebuy:this.rebuy,
          isCheck:false,
          index:-1
        },
        { 
          rebuyNever: true 
        })
    this.dataSource.filter = JSON.stringify(false); 
    this.select = "false"
    this.eventForm.next(1);
  }

  public rebuyAlways(){
    this.amount = parseFloat(this.userData.membership);
    this.membershipBalance = this.amount * this.initialMembershipLeverage - this.amount * this.percentRewards;
    this.dailyRewards = this.amount * this.percentRewards;
    this.rebuy = parseFloat((this.dailyRewards / this.minimumBalanceRebuy).toString().split('.')[0]) * this.minimumBalanceRebuy;

    this.calculate({
        amount: this.amount ,
        dailyRewards: this.dailyRewards,
        membershipBalance: this.membershipBalance,
        rebuy:this.rebuy,
        isCheck:true,
        index:-1
      },{
        rebuyAlways:true
      })

      this.dataSource.filter = JSON.stringify(true); 
      this.select = "true"
      this.eventForm.next(1);
  }

  protected retire(indice, isCheck?:boolean) {
    // console.log('retirar');
    this.rebuy = this.table[indice].rebuy;
    this.amount = this.table[indice].amount + this.rebuy - this.rebuy;
    this.dailyRewards =this.table[indice].dailyRewards - this.rebuy + this.amount * this.percentRewards ;
    this.rebuy =parseFloat((this.dailyRewards / this.minimumBalanceRebuy).toString().split('.')[0]) * this.minimumBalanceRebuy;
    this.membershipBalance = this.table[indice].membershipBalance - this.amount * this.percentRewards ;

    this.calculate({
        amount: this.amount ,
        dailyRewards: this.dailyRewards,
        membershipBalance: this.membershipBalance,
        rebuy:this.rebuy,
        isCheck:isCheck,
        index:indice
      })
  }

  protected invert(indice, isCheck?:boolean) {
    // console.log('reinvertir');
    this.rebuy = this.table[indice].rebuy;
    this.amount = this.table[indice].amount + this.rebuy;
    this.dailyRewards = this.table[indice].dailyRewards - this.rebuy + this.amount * this.percentRewards;
    this.membershipBalance =this.table[indice].membershipBalance -this.amount * this.percentRewards + this.initialMembershipLeverage * this.rebuy;
    this.rebuy =  parseFloat((this.dailyRewards / this.minimumBalanceRebuy).toString().split('.')[0]) * this.minimumBalanceRebuy;

    this.calculate({
        amount: this.amount ,
        dailyRewards: this.dailyRewards,
        membershipBalance: this.membershipBalance,
        rebuy:this.rebuy,
        isCheck:isCheck,
        index:indice
      })
  }

  protected createFilter() {
    let filterFunction = function (data, filter) {
      if (filter == 'all') {
        return  String(data.isCheck).includes('true') ||  String(data.isCheck).includes('false');
      } else {
        return String(data.isCheck).includes(filter) && data.dailyRewards >= this.minimumBalanceRebuy;
      }
    };
    this.eventForm.next(1);
    return filterFunction;
  }

  public triggerEventKey(event: any) {
    if (this.userData.membership != null)
      this.membership3X = parseFloat(this.userData.membership) * this.initialMembershipLeverage;
    else 
      this.membership3X = 0;

    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.select = "all"
      this.updateTable();
    }, 1000);
  }

  public dataPicker(event?) {
    this.table.forEach((element, index) => {
      element.date = new Date(this.userData.date).setDate(
        new Date(this.userData.date).getDate() + (index + 1)
      );
    });
    this.returnInvestmentDate();

  }
  public paginationChange(paginationDetails) {
    this.paginatorTable.nativeElement.scrollIntoView({behavior:"smooth"});
  }

  public returnInvestmentDate(){
    let [sumRebuy,cont] = [0,0];

    this.table.forEach( (element) => {
        sumRebuy+=element.rebuy
        if(sumRebuy >=parseInt(this.userData.membership)){
          cont++;
          if(cont==1){
            this.dateReturnInvest.date = element.date
            this.dateReturnInvest.day = element.days
          }
        }
      });

  }

}
